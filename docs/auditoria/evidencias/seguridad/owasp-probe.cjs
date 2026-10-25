// Sondeo local de controles OWASP con datos ficticios contra http://127.0.0.1:3102 (copia local af_after).
// Uso: PROBE_LOGIN_PASSWORD y PROBE_NEW_PASSWORD con las contraseñas de los usuarios ficticios locales (no se guardan en el repositorio).
const base='http://127.0.0.1:3102/api';const out=[];const rec=(id,desc,ok,detail)=>out.push({id,desc,resultado:ok?'PASA':'FALLA',detalle:detail});
const j=async(m,p,b,t,extra={})=>{const r=await fetch(base+p,{method:m,headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{}),...extra},body:b?JSON.stringify(b):undefined});let d=null;try{d=await r.json();}catch{}return {s:r.status,d,h:r.headers};};
(async()=>{
 const A=(await j('POST','/auth/login',{correo:'amigo@local.test',password:process.env.PROBE_LOGIN_PASSWORD})).d.token;
 const mail=`sonda${Date.now()}@local.test`;
 const reg=await j('POST','/auth/registro',{nombre:'Sonda Prueba',correo:mail,password:process.env.PROBE_NEW_PASSWORD,moneda:'USD'});
 rec('A07-1','Registro con contraseña fuerte',reg.s<300,`HTTP ${reg.s}`);
 const weak=await j('POST','/auth/registro',{nombre:'Debil Prueba',correo:'d'+mail,password:'debilprueba',moneda:'USD'});rec('A07-2','Rechaza contraseña débil',weak.s===400,`HTTP ${weak.s}`);
 const same=await j('POST','/auth/registro',{nombre:'Sonda Prueba',correo:'s'+mail,password:'Sonda#2026Abc',moneda:'USD'});rec('A07-3','Rechaza contraseña que contiene el nombre',same.s===400,`HTTP ${same.s}`);
 const B=(await j('POST','/auth/login',{correo:mail,password:process.env.PROBE_NEW_PASSWORD})).d?.token;
 const aw=(await j('GET','/finanzas/carteras',null,A)).d.data;const aEur=aw.find(w=>w.moneda==='EUR');const aUsd=aw.find(w=>w.moneda==='USD'&&Number(w.saldo_actual)>0);
 const bw=(await j('POST','/finanzas/carteras',{nombre:'Propia',moneda:'USD',saldo_inicial:'1'},B)).d.data;
 let r=await j('GET',`/finanzas/carteras/${aEur.id}/conversion?moneda=USD`,null,B);rec('A01-1','B no puede cotizar la conversión de una cartera de A',r.s===404,`HTTP ${r.s}`);
 r=await j('POST',`/finanzas/carteras/${aEur.id}/conversion`,{moneda_destino:'USD',confirmar:true,tasa:'1',idempotencia:'x'.repeat(36)},B);rec('A01-2','B no puede convertir una cartera de A',r.s===404,`HTTP ${r.s}`);
 r=await j('GET',`/finanzas/carteras/${aEur.id}/conversiones`,null,B);rec('A01-3','B no ve el historial de conversiones de A',r.s===404,`HTTP ${r.s}`);
 r=await j('POST','/finanzas/transferencias/preview',{origen_id:aUsd.id,destino_id:bw.id,monto:'1'},B);rec('A01-4','B no puede transferir desde una cartera de A',r.s===404,`HTTP ${r.s}`);
 r=await j('GET','/usuarios',null,B);rec('A01-5','Usuario sin rol admin no lista usuarios',r.s===403||r.s===401,`HTTP ${r.s}`);
 r=await j('GET','/finanzas/panel');rec('A01-6','Sin token no hay acceso al panel',r.s===401,`HTTP ${r.s}`);
 r=await j('GET','/tasas/actualizar');rec('A08-1','Cron de tasas exige CRON_SECRET',r.s===401,`HTTP ${r.s}`);
 r=await j('GET','/finanzas/panel',null,'eyJhbGciOiJub25lIn0.eyJpZCI6MX0.');rec('A07-4','Rechaza JWT con alg none',r.s===401,`HTTP ${r.s}`);
 r=await j('POST','/finanzas/transferencias',{origen_id:aUsd.id,destino_id:aEur.id,monto:'1',idempotencia:'y'.repeat(36)},A);rec('A06-1','Transferencia entre monedas exige confirmar la tasa',r.s===400&&r.d?.code==='CONFIRMACION_REQUERIDA',`HTTP ${r.s} ${r.d?.code}`);
 r=await j('POST','/finanzas/transferencias',{origen_id:aUsd.id,destino_id:aEur.id,monto:'1',confirmar:true,tasa:'0.5',idempotencia:'z'.repeat(36)},A);rec('A06-2','Tasa distinta a la vigente se rechaza',r.s===409&&r.d?.code==='TASA_CAMBIADA',`HTTP ${r.s} ${r.d?.code}`);
 r=await j('POST','/finanzas/carteras',{nombre:"'; DROP TABLE cuentas;--",moneda:'USD'},A);rec('A05-1','Nombre con SQL se rechaza por validación (y las consultas son parametrizadas)',r.s===400,`HTTP ${r.s}`);
 r=await j('POST','/finanzas/carteras',{nombre:'<script>alert(1)</script>',moneda:'USD'},A);rec('A05-2','Nombre con marcado se rechaza',r.s===400,`HTTP ${r.s}`);
 r=await j('GET','/finanzas/panel?moneda=ZZZ',null,A);rec('A10-1','Moneda inválida da 400 sin detalles internos',r.s===400&&!/at |stack|pg/i.test(JSON.stringify(r.d)),`HTTP ${r.s}`);
 r=await j('POST','/finanzas/carteras','[1,2]',A);rec('A10-2','Cuerpo no objeto da 400',r.s===400,`HTTP ${r.s}`);
 const h=(await j('GET','/health')).h;rec('A02-1','Cabeceras de seguridad (CSP, nosniff, frame)',!!h.get('content-security-policy')&&h.get('x-content-type-options')==='nosniff'&&!!h.get('x-frame-options'),`csp=${!!h.get('content-security-policy')} nosniff=${h.get('x-content-type-options')} xfo=${h.get('x-frame-options')}`);
 rec('A02-2','Sin cabecera X-Powered-By',!h.get('x-powered-by'),`x-powered-by=${h.get('x-powered-by')}`);
 r=await j('GET','/health',null,null,{origin:'https://evil.example'});rec('A02-3','CORS rechaza origen no permitido',r.s===403||!r.h.get('access-control-allow-origin'),`HTTP ${r.s} acao=${r.h.get('access-control-allow-origin')}`);
 console.log(JSON.stringify(out,null,1));console.log('FALLAS',out.filter(x=>x.resultado==='FALLA').length,'de',out.length);
})().catch(e=>{console.error(e);process.exit(1);});
