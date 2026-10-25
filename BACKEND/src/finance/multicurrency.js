'use strict';
// Valoración y operaciones entre monedas. Los importes viajan como centavos enteros.
const db=require('../config/db');
const v=require('./validation');
const fx=require('./fx');
const currency=require('./currency');

const iso=x=>x instanceof Date?x.toISOString().slice(0,10):String(x).slice(0,10);

// Valora grupos {moneda,dia,cents} en `target` usando, para cada día, la última tasa publicada
// hasta ese día (nunca la tasa actual para un movimiento antiguo). Lo que no tiene tasa queda aparte.
async function valuate(groups,target,client=db){
 const snaps=new Map();let total=0;const sinTasa=new Map();const fechas=new Set();
 for(const g of groups){
  if(!g.cents)continue;
  if(g.moneda===target){total+=g.cents;continue;}
  const day=g.dia?iso(g.dia):null;const key=day||'actual';
  if(!snaps.has(key))snaps.set(key,await fx.snapshot(day,client));
  const snap=snaps.get(key),q=fx.quote(snap,g.moneda,target);
  if(!q){sinTasa.set(g.moneda,(sinTasa.get(g.moneda)||0)+g.cents);continue;}
  total+=fx.convertCents(g.cents,q.racional);fechas.add(q.fecha_cotizacion);
 }
 return {cents:total,sin_tasa:[...sinTasa].map(([moneda,c])=>({moneda,monto:v.money(c)})),fechas_tasa:[...fechas].sort()};
}

// Cotización actual entre dos monedas con su antigüedad, o error explícito si no hay tasa.
async function currentQuote(from,to,client=db){
 await fx.maybeRefresh();
 const snap=await fx.snapshot(null,client),q=fx.quote(snap,from,to);
 if(!q)v.fail(`No hay una tasa de referencia disponible para ${from}→${to}. La operación no se registró.`,409,'SIN_TASA');
 return {...q,...fx.status(snap,v.today()),tasa:q.tasa};
}
function publicQuote(q){return {tasa:q.tasa,fuente:q.fuente,fecha_cotizacion:q.fecha_cotizacion,estado:q.estado,antiguedad_dias:q.antiguedad_dias};}

// La persona confirma la tasa que vio; si cambió entre la vista previa y el envío, se rechaza.
function checkConfirmed(b,q){
 if(b.confirmar!==true)v.fail('Confirma la conversión con la tasa mostrada.',400,'CONFIRMACION_REQUERIDA');
 if(typeof b.tasa!=='string'||b.tasa!==q.tasa){const e=new Error('La tasa cambió desde la vista previa. Revisa el nuevo importe y confirma otra vez.');e.status=409;e.code='TASA_CAMBIADA';e.expose=true;e.cotizacion=publicQuote(q);throw e;}
}

async function walletFor(c,uid,id,lock=true){const r=(await c.query(`SELECT * FROM cuentas WHERE id=$1 AND usuario_id=$2 AND deleted_at IS NULL${lock?' FOR UPDATE':''}`,[v.id(id),uid])).rows[0];if(!r)v.fail('Cartera no disponible.',404);return r;}

async function previewTransfer(uid,b){
 const amount=v.cents(b.monto);const [o,d]=await Promise.all([walletFor(db,uid,b.origen_id,false),walletFor(db,uid,b.destino_id,false)]);
 if(o.id===d.id)v.fail('Selecciona carteras diferentes.');
 if(o.moneda===d.moneda)return {moneda_origen:o.moneda,moneda_destino:d.moneda,monto_origen:v.money(amount),monto_destino:v.money(amount),conversion:false};
 const q=await currentQuote(o.moneda,d.moneda);
 return {moneda_origen:o.moneda,moneda_destino:d.moneda,monto_origen:v.money(amount),monto_destino:v.money(fx.convertCents(amount,q.racional)),conversion:true,cotizacion:publicQuote(q)};
}

// Transferencia entre carteras del mismo usuario. Si las monedas difieren, se guarda el importe
// de destino, la tasa, su fuente y su fecha en el propio movimiento.
async function transfer(uid,b,movement){
 const amount=v.cents(b.monto),key=v.key(b.idempotencia),origen=v.id(b.origen_id),destino=v.id(b.destino_id);
 const descripcion=b.descripcion==null||b.descripcion===''?null:v.text(b.descripcion,'Descripción',250);
 const request=JSON.stringify({amount,origen,destino,descripcion});
 const peek=await previewTransfer(uid,b);let q=null;
 if(peek.conversion){q=await currentQuote(peek.moneda_origen,peek.moneda_destino);checkConfirmed(b,q);}
 return db.withTransaction(async c=>{
  await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[uid]);
  const prior=(await c.query('SELECT solicitud,movimiento_id FROM fin_transferencias WHERE usuario_id=$1 AND idempotencia=$2',[uid,key])).rows[0];
  if(prior){if(prior.solicitud!==request)v.fail('La clave ya fue usada con otros datos.',409,'IDEMPOTENCIA_CONFLICTO');return {movimiento_id:prior.movimiento_id,repetido:true};}
  const conversion=q?{monto_destino:fx.convertCents(amount,q.racional),tasa:q.tasa,tasa_fuente:q.fuente,tasa_fecha:q.fecha_cotizacion}:null;
  const mid=await movement(c,uid,{tipo:'TRANSFERENCIA',monto:amount,origen,destino,descripcion:descripcion||'Transferencia entre carteras',modulo:'transferencia',conversion});
  await c.query('INSERT INTO fin_transferencias(usuario_id,movimiento_id,idempotencia,solicitud) VALUES($1,$2,$3,$4)',[uid,mid,key,request]);
  return {movimiento_id:mid,monto_origen:v.money(amount),moneda_origen:peek.moneda_origen,monto_destino:v.money(conversion?conversion.monto_destino:amount),moneda_destino:peek.moneda_destino,cotizacion:q?publicQuote(q):null,repetido:false};
 });
}

async function conversionBlockers(c,wallet){
 if((await c.query('SELECT 1 FROM fin_metas WHERE cuenta_id=$1',[wallet.id])).rows.length)v.fail('Las carteras de metas no se convierten: su objetivo está en la moneda de la meta.',409,'CARTERA_META');
 if((await c.query('SELECT 1 FROM fin_recurrentes WHERE cuenta_id=$1 AND activo',[wallet.id])).rows.length)v.fail('Esta cartera tiene recordatorios activos. Desactívalos o muévelos a otra cartera antes de convertirla.',409,'CARTERA_CON_RECURRENTES');
}
async function previewConversion(uid,id,moneda){
 const target=currency.validate(moneda);const w=await walletFor(db,uid,id,false);
 if(w.moneda===target)v.fail('La cartera ya está en esa moneda.',400,'MISMA_MONEDA');
 await conversionBlockers(db,w);const q=await currentQuote(w.moneda,target);const saldo=v.dbCents(w.saldo_actual);
 return {cuenta_id:w.id,nombre:w.nombre,moneda_origen:w.moneda,moneda_destino:target,saldo_origen:v.money(saldo),saldo_destino:v.money(fx.convertCents(saldo,q.racional)),cotizacion:publicQuote(q),
  aviso:'Los movimientos anteriores se conservan en su moneda original y dejarán de poder editarse o anularse.'};
}
// Conversión explícita, confirmada e idempotente. El historial no se recalcula.
async function convertWallet(uid,id,b){
 const target=currency.validate(b.moneda_destino),key=v.key(b.idempotencia),walletId=v.id(id);
 const w0=await walletFor(db,uid,walletId,false);
 const prior0=(await db.query('SELECT * FROM fin_conversiones WHERE usuario_id=$1 AND idempotencia=$2',[uid,key])).rows[0];
 if(prior0){if(prior0.cuenta_id!==walletId||prior0.moneda_destino!==target)v.fail('La clave ya fue usada con otros datos.',409,'IDEMPOTENCIA_CONFLICTO');return {...prior0,repetido:true};}
 if(w0.moneda===target)v.fail('La cartera ya está en esa moneda.',400,'MISMA_MONEDA');
 const q=await currentQuote(w0.moneda,target);checkConfirmed(b,q);
 return db.withTransaction(async c=>{
  await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[uid]);
  const prior=(await c.query('SELECT * FROM fin_conversiones WHERE usuario_id=$1 AND idempotencia=$2',[uid,key])).rows[0];
  if(prior){if(prior.cuenta_id!==walletId||prior.moneda_destino!==target)v.fail('La clave ya fue usada con otros datos.',409,'IDEMPOTENCIA_CONFLICTO');return {...prior,repetido:true};}
  const w=await walletFor(c,uid,walletId,true);
  if(w.moneda!==w0.moneda)v.fail('La moneda de la cartera cambió. Revisa la vista previa.',409,'CARTERA_CAMBIADA');
  await conversionBlockers(c,w);
  const saldo=v.dbCents(w.saldo_actual),nuevo=fx.convertCents(saldo,q.racional);
  await c.query("SELECT set_config('af.conversion_cartera',$1,true)",[String(w.id)]);
  await c.query('UPDATE cuentas SET moneda=$1,saldo_actual=$2 WHERE id=$3',[target,v.money(nuevo),w.id]);
  await c.query("SELECT set_config('af.conversion_cartera','',true)");
  const r=(await c.query(`INSERT INTO fin_conversiones(usuario_id,cuenta_id,moneda_origen,moneda_destino,saldo_origen,saldo_destino,tasa,tasa_fuente,tasa_fecha,idempotencia)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[uid,w.id,w.moneda,target,v.money(saldo),v.money(nuevo),q.tasa,q.fuente,q.fecha_cotizacion,key])).rows[0];
  return {...r,repetido:false};
 });
}
async function listConversions(uid,id){await walletFor(db,uid,id,false);return (await db.query('SELECT * FROM fin_conversiones WHERE usuario_id=$1 AND cuenta_id=$2 ORDER BY id DESC',[uid,v.id(id)])).rows;}

module.exports={valuate,currentQuote,publicQuote,checkConfirmed,previewTransfer,transfer,previewConversion,convertWallet,listConversions};
