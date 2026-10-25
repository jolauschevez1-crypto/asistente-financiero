// Prueba de carga local (no producción) con datos ficticios.
// Uso: CARGA_PASSWORD=<contraseña ficticia válida> node carga.cjs <baseURL> <usuarios> <iteraciones> <salida.json>
// Cada usuario virtual se registra con un correo nuevo, sale de una IP de loopback distinta
// (127.0.0.10+n) para que el limitador por IP lo trate como un cliente distinto, y repite:
// panel, carteras y una transferencia entre sus dos carteras USD. Al final se comprueba que
// los saldos del servidor coinciden con los esperados y se lanza una ráfaga concurrente sobre
// una cartera con 3,00 USD para comprobar que nunca queda en negativo.
const http=require('node:http');const fs=require('node:fs');const crypto=require('node:crypto');
const [base,vusArg,itArg,out]=process.argv.slice(2);const VUS=Number(vusArg),IT=Number(itArg);const PW=process.env.CARGA_PASSWORD;
const u=new URL(base);const lat={};const errors=[];let total=0;
function req(ip,method,path,body,token){return new Promise(res=>{const data=body?JSON.stringify(body):null;const t0=process.hrtime.bigint();
 const r=http.request({host:u.hostname,port:u.port,path:'/api'+path,method,localAddress:ip,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...(data?{'content-length':Buffer.byteLength(data)}:{})}},resp=>{let s='';resp.on('data',c=>s+=c);resp.on('end',()=>{
  const ms=Number(process.hrtime.bigint()-t0)/1e6;const key=method+' '+path.replace(/\d+/g,':id').replace(/\?.*/,'');(lat[key]??=[]).push(ms);total++;
  let j=null;try{j=JSON.parse(s);}catch{}res({s:resp.statusCode,j,ms});});});
 r.on('error',e=>{errors.push({path,error:e.message});res({s:0,j:null});});if(data)r.write(data);r.end();});}
const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return +s[Math.min(s.length-1,Math.floor(p/100*s.length))].toFixed(1);};
const cents=x=>Math.round(Number(x)*100);
async function vu(n){const ip=`127.0.0.${10+n}`;const mail=`carga${Date.now()}${n}@local.test`;const res={vu:n,estado:{},fallos:[]};
 const bad=(paso,r)=>{res.fallos.push({paso,http:r.s,code:r.j?.code});};
 let r=await req(ip,'POST','/auth/registro',{nombre:'Carga Prueba',correo:mail,password:PW,moneda:'USD'});if(r.s>=300){bad('registro',r);return res;}
 r=await req(ip,'POST','/auth/login',{correo:mail,password:PW});const T=r.j?.token;if(!T){bad('login',r);return res;}
 const mk=async(nombre,saldo)=>{const x=await req(ip,'POST','/finanzas/carteras',{nombre,saldo_inicial:saldo,moneda:'USD'},T);if(x.s>=300)bad('crear '+nombre,x);return x.j?.data?.id??x.j?.id;};
 const A=await mk('Cuenta A','500.00'),B=await mk('Cuenta B','0.00'),C=await mk('Cuenta C','3.00');
 const exp={[A]:50000,[B]:0,[C]:300};
 for(let i=0;i<IT;i++){
  r=await req(ip,'GET','/finanzas/panel?moneda=USD',null,T);if(r.s!==200)bad('panel',r);
  r=await req(ip,'GET','/finanzas/carteras',null,T);if(r.s!==200)bad('carteras',r);
  const [o,d]=i%2?[B,A]:[A,B];const key=crypto.randomUUID();
  r=await req(ip,'POST','/finanzas/transferencias',{origen_id:o,destino_id:d,monto:'1.25',idempotencia:key},T);
  if(r.s===200||r.s===201){exp[o]-=125;exp[d]+=125;}else bad('transferencia',r);
  if(i%10===0){const rep=await req(ip,'POST','/finanzas/transferencias',{origen_id:o,destino_id:d,monto:'1.25',idempotencia:key},T);if(!(rep.s<300&&(rep.j?.data?.repetido??rep.j?.repetido)))bad('reintento idempotente',rep);}
 }
 // Ráfaga: 5 transferencias simultáneas de 1,00 desde C (saldo 3,00)
 const burst=await Promise.all([0,1,2,3,4].map(()=>req(ip,'POST','/finanzas/transferencias',{origen_id:C,destino_id:A,monto:'1.00',idempotencia:crypto.randomUUID()},T)));
 const ok=burst.filter(x=>x.s<300).length,rech=burst.filter(x=>x.s===409).length;exp[C]-=ok*100;exp[A]+=ok*100;
 res.rafaga={aceptadas:ok,rechazadas_409:rech,otras:burst.length-ok-rech};
 r=await req(ip,'GET','/finanzas/carteras',null,T);const list=r.j?.data??r.j;
 for(const w of (Array.isArray(list)?list:[])){res.estado[w.nombre]={servidor:cents(w.saldo_actual),esperado:exp[w.id]??0};}
 res.saldos_cuadran=Object.values(res.estado).length>=3&&Object.values(res.estado).every(x=>x.servidor===x.esperado);
 res.sin_negativos=Object.values(res.estado).every(x=>x.servidor>=0);return res;}
(async()=>{if(!PW)throw new Error('Falta CARGA_PASSWORD');const t0=Date.now();const vus=await Promise.all([...Array(VUS).keys()].map(vu));const secs=(Date.now()-t0)/1000;
 const resumen={};for(const [k,a] of Object.entries(lat))resumen[k]={n:a.length,p50:pct(a,50),p95:pct(a,95),max:+Math.max(...a).toFixed(1)};
 const all=Object.values(lat).flat();
 const report={fecha:new Date().toISOString(),base,usuarios:VUS,iteraciones:IT,duracion_s:+secs.toFixed(1),peticiones:total,rps:+(total/secs).toFixed(1),
  latencia_global:{p50:pct(all,50),p95:pct(all,95),max:+Math.max(...all).toFixed(1)},por_ruta:resumen,errores_red:errors.length,
  fallos:vus.flatMap(v=>v.fallos.map(f=>({vu:v.vu,...f}))),usuarios_detalle:vus.map(v=>({vu:v.vu,estado:v.estado,saldos_cuadran:v.saldos_cuadran,sin_negativos:v.sin_negativos,rafaga:v.rafaga}))};
 fs.writeFileSync(out,JSON.stringify(report,null,1));console.log(JSON.stringify({usuarios:VUS,peticiones:total,duracion_s:report.duracion_s,rps:report.rps,latencia_global:report.latencia_global,fallos:report.fallos.length,errores_red:errors.length,detalle:report.usuarios_detalle}));
})().catch(e=>{console.error(e);process.exit(1);});
