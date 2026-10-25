'use strict';
// Tasas de referencia (BCE vía Frankfurter). Se actualizan una vez por día hábil: nunca son
// "en tiempo real". Toda la aritmética usa enteros (BigInt) sobre centavos y tasas decimales.
const db=require('../config/db');
const FUENTE='frankfurter-bce';
const BASE='USD';
const CON_TASA=Object.freeze(['USD','EUR','MXN']);
const ESCALA=12;
const VIGENCIA_DIAS=4; // fin de semana + festivo del BCE
const RATE_RE=/^\d{1,9}(\.\d{1,12})?$/;
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
let ultimoIntento=0;

function providerUrl(){return (process.env.FX_PROVIDER_URL||'https://api.frankfurter.dev/v1').replace(/\/+$/,'');}
function enabled(){return process.env.FX_PROVIDER!=='off';}
function rational(text){
 const s=String(text);if(!RATE_RE.test(s))throw Object.assign(new Error('Tasa no válida.'),{status:502,code:'TASA_INVALIDA'});
 const [a,b='']=s.split('.');const d=10n**BigInt(b.length);const n=BigInt(a)*d+BigInt(b||0);
 if(n<=0n)throw Object.assign(new Error('Tasa no válida.'),{status:502,code:'TASA_INVALIDA'});return {n,d};
}
function decimal({n,d},scale=ESCALA){const f=10n**BigInt(scale);const q=(n*f*2n+d)/(2n*d);const s=q.toString().padStart(scale+1,'0');return `${s.slice(0,-scale)}.${s.slice(-scale)}`.replace(/\.?0+$/,'')||'0';}
// Redondeo half-up sobre importes no negativos en centavos.
function convertCents(cents,rate){const c=BigInt(cents);if(c<0n)throw Error('Importe negativo');const r=typeof rate==='object'?rate:rational(rate);const v=(c*r.n*2n+r.d)/(2n*r.d);if(v>BigInt(Number.MAX_SAFE_INTEGER))throw Object.assign(new Error('Importe convertido fuera de rango.'),{status:400});return Number(v);}
function iso(x){return x instanceof Date?x.toISOString().slice(0,10):String(x).slice(0,10);}
function daysBetween(a,b){return Math.round((Date.parse(`${b}T00:00:00Z`)-Date.parse(`${a}T00:00:00Z`))/86400000);}

// Valida la respuesta del proveedor antes de guardar nada.
function parseRates(rates){
 const out={};
 for(const code of CON_TASA){if(code===BASE)continue;const value=rates?.[code];
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>1e9)throw Object.assign(new Error(`Tasa ${code} ausente o no válida.`),{code:'PROVEEDOR_INVALIDO'});
  const text=String(value);if(!RATE_RE.test(text))throw Object.assign(new Error(`Tasa ${code} con formato no válido.`),{code:'PROVEEDOR_INVALIDO'});out[code]=text;}
 return out;
}
async function fetchJson(url,fetchImpl){
 const res=await fetchImpl(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)});
 if(!res.ok)throw Object.assign(new Error(`Proveedor de tasas respondió ${res.status}.`),{code:'PROVEEDOR_HTTP'});
 const body=await res.json();if(body?.base!==BASE)throw Object.assign(new Error('Base inesperada en el proveedor.'),{code:'PROVEEDOR_INVALIDO'});return body;
}
async function store(client,fecha,rates){
 let n=0;for(const [code,tasa] of Object.entries(rates)){
  const r=await client.query(`INSERT INTO tasas_cambio(base,cotizada,tasa,fuente,fecha_cotizacion) VALUES($1,$2,$3,$4,$5)
   ON CONFLICT(fuente,base,cotizada,fecha_cotizacion) DO NOTHING`,[BASE,code,tasa,FUENTE,fecha]);n+=r.rowCount||0;}
 return n;
}
async function refresh({fetchImpl=globalThis.fetch,client=db}={}){
 const to=CON_TASA.filter(c=>c!==BASE).join(',');
 const body=await fetchJson(`${providerUrl()}/latest?from=${BASE}&to=${to}`,fetchImpl);
 if(!DATE_RE.test(body.date||''))throw Object.assign(new Error('Fecha de cotización no válida.'),{code:'PROVEEDOR_INVALIDO'});
 const rates=parseRates(body.rates);return {fecha_cotizacion:body.date,insertadas:await store(client,body.date,rates),fuente:FUENTE};
}
// Completa el histórico para valorar movimientos antiguos con la tasa de su fecha.
async function backfill(desde,hasta,{fetchImpl=globalThis.fetch,client=db}={}){
 if(!DATE_RE.test(desde)||!DATE_RE.test(hasta)||desde>hasta)throw Object.assign(new Error('Rango no válido.'),{status:400});
 const to=CON_TASA.filter(c=>c!==BASE).join(',');
 const body=await fetchJson(`${providerUrl()}/${desde}..${hasta}?from=${BASE}&to=${to}`,fetchImpl);
 let insertadas=0,dias=0;
 for(const [fecha,rates] of Object.entries(body.rates||{})){if(!DATE_RE.test(fecha))continue;insertadas+=await store(client,fecha,parseRates(rates));dias++;}
 return {desde,hasta,dias,insertadas,fuente:FUENTE};
}
// Actualización perezosa: como máximo un intento cada 10 minutos por instancia y solo si la
// última cotización guardada tiene más de 12 horas. Un fallo nunca rompe la consulta.
async function maybeRefresh(){
 if(!enabled()||Date.now()-ultimoIntento<600000)return;
 const last=(await db.query('SELECT MAX(obtenida_en) AS t FROM tasas_cambio WHERE fuente=$1',[FUENTE])).rows[0]?.t;
 if(last&&Date.now()-new Date(last).getTime()<12*3600000)return;
 ultimoIntento=Date.now();
 try{await refresh();}catch(e){console.warn('[tasas] actualización no disponible:',e.code||e.name);}
}

// Fotografía de tasas: para cada moneda, la última cotización con fecha <= `fecha` (o la última).
async function snapshot(fecha=null,client=db){
 const r=await client.query(`SELECT DISTINCT ON (cotizada) cotizada,tasa::text AS tasa,fecha_cotizacion,obtenida_en FROM tasas_cambio
  WHERE base=$1 AND fuente=$2 AND ($3::date IS NULL OR fecha_cotizacion<=$3::date) ORDER BY cotizada,fecha_cotizacion DESC`,[BASE,FUENTE,fecha]);
 const rates=new Map([[BASE,{n:1n,d:1n}]]);let minDate=null,obtenida=null;
 for(const row of r.rows){rates.set(row.cotizada,rational(row.tasa.replace(/\.?0+$/,'')||'0'));const f=iso(row.fecha_cotizacion);if(!minDate||f<minDate)minDate=f;if(!obtenida||row.obtenida_en>obtenida)obtenida=row.obtenida_en;}
 return {rates,fecha_cotizacion:minDate,obtenida_en:obtenida?new Date(obtenida).toISOString():null,fuente:FUENTE};
}
// Tasa from→to como racional exacto, o null si falta alguna pata.
function rate(snap,from,to){
 if(from===to)return {n:1n,d:1n};const a=snap.rates.get(from),b=snap.rates.get(to);if(!a||!b)return null;
 return {n:b.n*a.d,d:b.d*a.n};
}
// Tasa redondeada a 12 decimales: es la que se guarda y la que se usa para calcular el importe,
// de modo que cualquier registro es reproducible a partir de sus propios campos.
function quote(snap,from,to){const r=rate(snap,from,to);if(!r)return null;const tasa=decimal(r);return {tasa,racional:rational(tasa),fuente:snap.fuente,fecha_cotizacion:snap.fecha_cotizacion};}
function status(snap,today){
 if(!snap.fecha_cotizacion)return {estado:'sin_tasa',fuente:snap.fuente,fecha_cotizacion:null,obtenida_en:null,antiguedad_dias:null};
 const age=daysBetween(snap.fecha_cotizacion,today);
 return {estado:age<=VIGENCIA_DIAS?'vigente':'desactualizada',fuente:snap.fuente,fecha_cotizacion:snap.fecha_cotizacion,obtenida_en:snap.obtenida_en,antiguedad_dias:age};
}
module.exports={FUENTE,BASE,CON_TASA,VIGENCIA_DIAS,rational,decimal,convertCents,parseRates,refresh,backfill,maybeRefresh,snapshot,rate,quote,status,_reset(){ultimoIntento=0;}};
