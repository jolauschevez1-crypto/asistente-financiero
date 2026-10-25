'use strict';
// Multidivisa v3: carteras por moneda, tasas de referencia, consolidación, conversión trazable.
// Todas las tasas de estas pruebas son ficticias y se insertan o sirven desde un proveedor local.
process.env.DB_ENGINE='pglite';
process.env.PGLITE_DATA_DIR='memory://';
process.env.NODE_ENV='test';
process.env.FX_PROVIDER='off';
process.env.JWT_SECRET='isolated-multidivisa-test-only-secret-value';
process.env.REFRESH_JWT_SECRET='isolated-multidivisa-test-only-refresh-secret';
const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const jwt=require('jsonwebtoken');
const db=require('../src/config/db');
const {initialize}=require('../scripts/init-local');
const fx=require('../src/finance/fx');
const mc=require('../src/finance/multicurrency');
const finance=require('../src/finance/service');
const ledger=require('../src/services/ledgerService');
const {today}=require('../src/finance/validation');
let server,url,cat,seq=0,provider,providerUrl,providerBody;
const sign=id=>jwt.sign({id,version:0},process.env.JWT_SECRET,{expiresIn:'5m'});
const daysAgo=n=>{const d=new Date(`${today()}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10);};
async function user(moneda='USD'){const n=++seq;return (await db.query('INSERT INTO usuarios(nombre,correo,moneda) VALUES($1,$2,$3) RETURNING *',[`Divisa ${n}`,`divisa${n}@example.test`,moneda])).rows[0];}
async function rates(fecha,values){for(const [code,tasa] of Object.entries(values))await db.query("INSERT INTO tasas_cambio(base,cotizada,tasa,fuente,fecha_cotizacion) VALUES('USD',$1,$2,$3,$4)",[code,tasa,fx.FUENTE,fecha]);}
async function request(route,{method='GET',body,token}={}){
 const res=await fetch(url+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:res.status,data:await res.json()};
}
const spend=(uid,origen,monto,fecha,categoria=cat)=>db.withTransaction(c=>finance.movement(c,uid,{tipo:'GASTO',monto,origen,categoria,descripcion:'Gasto de prueba',modulo:'prueba',fecha}));
before(async()=>{
 await initialize();
 cat=(await db.query("SELECT id FROM categorias WHERE nombre='Otros' AND usuario_id IS NULL")).rows[0].id;
 server=require('../src/app').listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));url=`http://127.0.0.1:${server.address().port}/api`;
 // Proveedor local con la forma de respuesta de Frankfurter.
 provider=http.createServer((req,res)=>{const b=typeof providerBody==='function'?providerBody(req):providerBody;res.writeHead(b.status||200,{'Content-Type':'application/json'});res.end(JSON.stringify(b.json));});
 provider.listen(0,'127.0.0.1');await new Promise(r=>provider.once('listening',r));providerUrl=`http://127.0.0.1:${provider.address().port}/v1`;
});
beforeEach(async()=>{await db.query('DELETE FROM tasas_cambio');fx._reset();process.env.FX_PROVIDER='off';});
after(async()=>{await new Promise(r=>server.close(r));await new Promise(r=>provider.close(r));await db.pool.end();});

test('aritmética exacta: tasas racionales, cruce EUR→MXN y redondeo half-up en centavos',()=>{
 assert.deepEqual(fx.rational('0.89342'),{n:89342n,d:100000n});
 assert.equal(fx.convertCents(10000,'0.9'),9000);
 assert.equal(fx.convertCents(1,'0.5'),1);        // 0.5 centavos -> 1 (half-up)
 assert.equal(fx.convertCents(1,'0.49'),0);
 assert.equal(fx.convertCents(99999999999,'1'),99999999999);
 const snap={rates:new Map([['USD',{n:1n,d:1n}],['EUR',fx.rational('0.8')],['MXN',fx.rational('20')]]),fuente:fx.FUENTE,fecha_cotizacion:'2026-10-23'};
 assert.equal(fx.quote(snap,'EUR','MXN').tasa,'25');
 assert.equal(fx.quote(snap,'MXN','USD').tasa,'0.05');
 assert.equal(fx.quote(snap,'USD','EUR').tasa,'0.8');
 assert.equal(fx.quote(snap,'EUR','USD').tasa,'1.25');
 assert.equal(fx.quote(snap,'USD','COP'),null);
 // 1/3 no es exacto: la tasa guardada (12 decimales) es la que produce el importe.
 const third={rates:new Map([['USD',{n:1n,d:1n}],['EUR',fx.rational('3')]]),fuente:fx.FUENTE,fecha_cotizacion:'2026-10-23'};
 const q=fx.quote(third,'EUR','USD');assert.equal(q.tasa,'0.333333333333');assert.equal(fx.convertCents(300,q.racional),100);
 assert.throws(()=>fx.parseRates({EUR:-1,MXN:18}),{code:'PROVEEDOR_INVALIDO'});
 assert.throws(()=>fx.parseRates({EUR:0.9}),{code:'PROVEEDOR_INVALIDO'});
 assert.throws(()=>fx.rational('1e5'));
});

test('el proveedor guarda par, tasa, fuente, fecha de cotización y de obtención; una respuesta inválida no guarda nada',async()=>{
 process.env.FX_PROVIDER_URL=providerUrl;
 providerBody={json:{amount:1,base:'USD',date:'2026-10-23',rates:{EUR:0.89342,MXN:18.7823}}};
 const r=await fx.refresh();assert.equal(r.fecha_cotizacion,'2026-10-23');assert.equal(r.insertadas,2);
 assert.equal((await fx.refresh()).insertadas,0); // idempotente por (fuente,par,fecha)
 const rows=(await db.query('SELECT base,cotizada,tasa::text,fuente,fecha_cotizacion::text,obtenida_en FROM tasas_cambio ORDER BY cotizada')).rows;
 assert.deepEqual(rows.map(x=>[x.base,x.cotizada,x.tasa,x.fuente,x.fecha_cotizacion]),[['USD','EUR','0.893420000000',fx.FUENTE,'2026-10-23'],['USD','MXN','18.782300000000',fx.FUENTE,'2026-10-23']]);
 assert.ok(rows.every(x=>x.obtenida_en instanceof Date));
 for(const bad of [{json:{base:'EUR',date:'2026-10-24',rates:{USD:1.1}}},{json:{base:'USD',date:'2026-10-24',rates:{EUR:'0.9',MXN:18}}},{status:503,json:{}}]){
  providerBody=bad;await assert.rejects(fx.refresh());
 }
 assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM tasas_cambio')).rows[0].n,2);
 providerBody={json:{amount:1,base:'USD',start_date:'2026-10-01',end_date:'2026-10-02',rates:{'2026-10-01':{EUR:0.88,MXN:18.1},'2026-10-02':{EUR:0.881,MXN:18.2}}}};
 assert.deepEqual(await fx.backfill('2026-10-01','2026-10-02'),{desde:'2026-10-01',hasta:'2026-10-02',dias:2,insertadas:4,fuente:fx.FUENTE});
 delete process.env.FX_PROVIDER_URL;
});

test('cron de tasas exige CRON_SECRET y, si el proveedor falla, se conserva la última tasa válida',async()=>{
 process.env.FX_PROVIDER_URL=providerUrl;delete process.env.CRON_SECRET;
 assert.equal((await request('/tasas/actualizar')).status,401);
 process.env.CRON_SECRET='cron-secret-for-tests-only-0001';
 assert.equal((await request('/tasas/actualizar',{token:'otro-valor'})).status,401);
 providerBody={json:{amount:1,base:'USD',date:daysAgo(1),rates:{EUR:0.9,MXN:18}}};
 const ok=await request('/tasas/actualizar',{token:'cron-secret-for-tests-only-0001'});
 assert.equal(ok.status,200);assert.equal(ok.data.data.insertadas,2);
 providerBody={status:500,json:{}};
 assert.equal((await request('/tasas/actualizar',{token:'cron-secret-for-tests-only-0001'})).status,502);
 const u=await user('USD');const t=await request('/finanzas/tasas',{token:sign(u.id)});
 assert.equal(t.status,200);assert.equal(t.data.data.fecha_cotizacion,daysAgo(1));assert.equal(t.data.data.estado,'vigente');
 assert.deepEqual(t.data.data.tasas,[{par:'USD/EUR',tasa:'0.9'},{par:'USD/MXN',tasa:'18'}]);
 const eur=await request('/finanzas/tasas?moneda=EUR',{token:sign(u.id)});
 assert.equal(eur.data.data.moneda,'EUR');assert.deepEqual(eur.data.data.tasas_a,{USD:'0.9',EUR:'1',MXN:'0.05'});
 assert.equal((await request('/finanzas/tasas?moneda=COP',{token:sign(u.id)})).data.data.tasas_a,undefined);
 delete process.env.CRON_SECRET;delete process.env.FX_PROVIDER_URL;
});

test('panel en USD por defecto consolida USD y EUR, separa COP sin tasa y permite elegir EUR',async()=>{
 await rates(daysAgo(1),{EUR:'0.9',MXN:'18'});
 const u=await user('USD');
 const usd=await finance.createWallet(u.id,{nombre:'Banco',saldo_inicial:100});
 const eur=await finance.createWallet(u.id,{nombre:'Cuenta en euros con un nombre muy largo para revisar la interfaz',moneda:'EUR',saldo_inicial:50});
 await finance.createWallet(u.id,{nombre:'Pesos',moneda:'COP',saldo_inicial:1000});
 assert.equal(eur.moneda,'EUR');assert.equal(usd.moneda,'USD');
 const p=await request('/finanzas/panel',{token:sign(u.id)});assert.equal(p.status,200);const d=p.data.data;
 assert.equal(d.moneda,'USD');
 assert.equal(d.saldo_total,'155.56'); // 100 + 50/0.9 = 155.555… -> 155.56
 assert.equal(d.saldo_total_completo,false);
 assert.deepEqual(d.saldos_sin_convertir,[{moneda:'COP',saldo:'1000.00'}]);
 assert.deepEqual(d.saldos_por_moneda.map(x=>[x.moneda,x.saldo,x.convertido]),[['COP','1000.00',null],['EUR','50.00','55.56'],['USD','100.00','100.00']]);
 assert.equal(d.tasas.estado,'vigente');assert.equal(d.tasas.antiguedad_dias,1);assert.equal(d.tasas.fuente,fx.FUENTE);
 assert.equal(d.tasas_a_base.EUR,'1.111111111111');assert.equal(d.tasas_a_base.USD,'1');assert.equal(d.tasas_a_base.COP,null);
 assert.ok(d.alertas.some(a=>/COP/.test(a.mensaje)));
 assert.deepEqual(d.tendencia,[{mes:today().slice(0,7),ingresos:'155.56',gastos:'0.00',completo:false}]);assert.deepEqual(d.gastos_categoria,[]);
 const h=(await request('/movimientos',{token:sign(u.id)})).data.data;
 assert.deepEqual(h.map(x=>x.moneda).sort(),['COP','EUR','USD']);
 // Ingresos de apertura del mes: 100 USD + 50 EUR; COP sin tasa queda aparte.
 assert.equal(d.ingresos,'155.56');assert.equal(d.flujos_completos,false);assert.deepEqual(d.flujos_sin_tasa.ingresos,[{moneda:'COP',monto:'1000.00'}]);
 const e=(await request('/finanzas/panel?moneda=EUR',{token:sign(u.id)})).data.data;
 assert.equal(e.moneda,'EUR');assert.equal(e.saldo_total,'140.00'); // 100*0.9 + 50
 assert.equal((await request('/finanzas/panel?moneda=ZZZ',{token:sign(u.id)})).status,400);
 assert.equal((await request('/finanzas/preferencias',{token:sign(u.id)})).data.data.moneda,'USD');
});

test('sin ninguna tasa no hay total engañoso; con tasa antigua se usa la última y se avisa su antigüedad',async()=>{
 const u=await user('USD');
 await finance.createWallet(u.id,{nombre:'Banco',saldo_inicial:10});
 await finance.createWallet(u.id,{nombre:'Euros',moneda:'EUR',saldo_inicial:20});
 let d=await finance.panel(u.id);
 assert.equal(d.tasas.estado,'sin_tasa');assert.equal(d.saldo_total,'10.00');assert.equal(d.saldo_total_completo,false);
 assert.deepEqual(d.saldos_sin_convertir,[{moneda:'EUR',saldo:'20.00'}]);
 await rates(daysAgo(10),{EUR:'0.8',MXN:'18'});
 d=await finance.panel(u.id);
 assert.equal(d.tasas.estado,'desactualizada');assert.equal(d.tasas.antiguedad_dias,10);
 assert.equal(d.saldo_total,'35.00');assert.equal(d.saldo_total_completo,true);
 assert.ok(d.alertas.some(a=>/10 días/.test(a.mensaje)));
});

test('los flujos históricos se valoran con la tasa de su fecha, nunca con la actual',async()=>{
 const u=await user('USD');const month=today().slice(0,7);
 const day1=`${month}-01`;
 await rates(daysAgo(40),{EUR:'0.8',MXN:'18'});
 await rates(today(),{EUR:'0.5',MXN:'18'});
 const eur=await finance.createWallet(u.id,{nombre:'Euros',moneda:'EUR',saldo_inicial:0});
 await db.query("SELECT 1");
 // Ingreso inicial con fecha anterior a la tasa de hoy (via saldo y gasto fechado el día 1 del mes).
 await db.withTransaction(c=>finance.movement(c,u.id,{tipo:'INGRESO',monto:2000,destino:eur.id,descripcion:'Ingreso',modulo:'prueba',fecha:day1}));
 await spend(u.id,eur.id,1000,day1);
 const d=await finance.panel(u.id,month);
 if(day1<today()){ // el día 1 usa la tasa de hace 40 días (0.8): 10 EUR = 12.50 USD
  assert.equal(d.gastos,'12.50');assert.equal(d.ingresos,'25.00');
 }
 assert.equal(d.saldo_total,'20.00'); // saldo actual 10 EUR con la tasa de hoy (0.5)
 // Un movimiento anterior a cualquier tasa guardada no se valora con una tasa posterior.
 await db.query('DELETE FROM tasas_cambio');await rates(today(),{EUR:'0.5',MXN:'18'});
 const v=await mc.valuate([{moneda:'EUR',dia:daysAgo(5),cents:1000}],'USD');
 assert.equal(v.cents,0);assert.deepEqual(v.sin_tasa,[{moneda:'EUR',monto:'10.00'}]);
});

test('transferencia entre monedas: vista previa, confirmación de tasa, saldos e idempotencia',async()=>{
 await rates(daysAgo(1),{EUR:'0.9',MXN:'18'});
 const u=await user('USD'),token=sign(u.id);
 const usd=await finance.createWallet(u.id,{nombre:'Dólares',saldo_inicial:100});
 const eur=await finance.createWallet(u.id,{nombre:'Euros',moneda:'EUR'});
 const prev=await request('/finanzas/transferencias/preview',{method:'POST',token,body:{origen_id:usd.id,destino_id:eur.id,monto:'25.55'}});
 assert.equal(prev.status,200);assert.equal(prev.data.data.monto_destino,'23.00');assert.equal(prev.data.data.cotizacion.tasa,'0.9');
 const base={origen_id:usd.id,destino_id:eur.id,monto:'25.55',idempotencia:'transfer-0001'};
 assert.equal((await request('/finanzas/transferencias',{method:'POST',token,body:base})).data.code,'CONFIRMACION_REQUERIDA');
 const wrong=await request('/finanzas/transferencias',{method:'POST',token,body:{...base,confirmar:true,tasa:'0.95'}});
 assert.equal(wrong.status,409);assert.equal(wrong.data.code,'TASA_CAMBIADA');assert.equal(wrong.data.cotizacion.tasa,'0.9');
 const ok=await request('/finanzas/transferencias',{method:'POST',token,body:{...base,confirmar:true,tasa:'0.9'}});
 assert.equal(ok.status,200,JSON.stringify(ok.data));assert.equal(ok.data.data.monto_destino,'23.00');
 const again=await request('/finanzas/transferencias',{method:'POST',token,body:{...base,confirmar:true,tasa:'0.9'}});
 assert.equal(again.data.data.repetido,true);
 const w=await finance.listWallets(u.id);
 assert.equal(w.find(x=>x.id===usd.id).saldo_actual,'74.45');assert.equal(w.find(x=>x.id===eur.id).saldo_actual,'23.00');
 const m=(await db.query('SELECT moneda,moneda_destino,monto::text,monto_destino::text,tasa::text,tasa_fuente,tasa_fecha::text FROM movimientos WHERE id=$1',[ok.data.data.movimiento_id])).rows[0];
 assert.deepEqual(m,{moneda:'USD',moneda_destino:'EUR',monto:'25.55',monto_destino:'23.00',tasa:'0.900000000000',tasa_fuente:fx.FUENTE,tasa_fecha:daysAgo(1)});
 // El historial guardado no cambia aunque llegue una tasa nueva.
 await rates(today(),{EUR:'0.5',MXN:'18'});
 assert.equal((await db.query('SELECT monto_destino::text FROM movimientos WHERE id=$1',[ok.data.data.movimiento_id])).rows[0].monto_destino,'23.00');
 // Mismo-moneda: sin conversión; sin saldo: rechazo atómico.
 const usd2=await finance.createWallet(u.id,{nombre:'Otra USD'});
 const same=await request('/finanzas/transferencias',{method:'POST',token,body:{origen_id:usd.id,destino_id:usd2.id,monto:'4.45',idempotencia:'transfer-0002'}});
 assert.equal(same.status,200);assert.equal(same.data.data.cotizacion,null);
 const poor=await request('/finanzas/transferencias',{method:'POST',token,body:{origen_id:usd2.id,destino_id:eur.id,monto:'500',idempotencia:'transfer-0003',confirmar:true,tasa:'0.5'}});
 assert.equal(poor.status,409);assert.equal(poor.data.code,'SALDO_INSUFICIENTE');
 // La ruta histórica de movimientos no mezcla monedas ni anula una conversión.
 await assert.rejects(ledger.create({usuario_id:u.id,tipo:'TRANSFERENCIA',monto:1,cuenta_origen:'Dólares',cuenta_destino:'Euros'}),{code:'P0001'});
 await assert.rejects(db.query('UPDATE movimientos SET deleted_at=NOW() WHERE id=$1',[ok.data.data.movimiento_id]),{code:'P0001'});
 await assert.rejects(db.query('UPDATE movimientos SET tasa=1 WHERE id=$1',[ok.data.data.movimiento_id]),{code:'P0001'});
 const cop=await finance.createWallet(u.id,{nombre:'Pesos',moneda:'COP'});
 const none=await request('/finanzas/transferencias/preview',{method:'POST',token,body:{origen_id:usd.id,destino_id:cop.id,monto:'1'}});
 assert.equal(none.status,409);assert.equal(none.data.code,'SIN_TASA');
});

test('conversión de una cartera con actividad: confirmada, trazable, idempotente y sin recalcular historial',async()=>{
 await rates(daysAgo(1),{EUR:'0.9',MXN:'18'});
 const u=await user('USD'),token=sign(u.id),other=await user('USD');
 await ledger.create({usuario_id:u.id,tipo:'INGRESO',monto:100,cuenta_origen:'Viajes'});
 const wallet=(await finance.listWallets(u.id)).find(w=>w.nombre==='Viajes');
 const oldMovement=(await db.query('SELECT id FROM movimientos WHERE cuenta_origen_id=$1',[wallet.id])).rows[0].id;
 const prev=await request(`/finanzas/carteras/${wallet.id}/conversion?moneda=EUR`,{token});
 assert.equal(prev.status,200);assert.equal(prev.data.data.saldo_destino,'90.00');assert.match(prev.data.data.aviso,/moneda original/);
 assert.equal((await request(`/finanzas/carteras/${wallet.id}/conversion?moneda=EUR`,{token:sign(other.id)})).status,404);
 const body={moneda_destino:'EUR',idempotencia:'convert-0001',tasa:'0.9'};
 assert.equal((await request(`/finanzas/carteras/${wallet.id}/conversion`,{method:'POST',token,body})).data.code,'CONFIRMACION_REQUERIDA');
 const ok=await request(`/finanzas/carteras/${wallet.id}/conversion`,{method:'POST',token,body:{...body,confirmar:true}});
 assert.equal(ok.status,200,JSON.stringify(ok.data));
 assert.equal(ok.data.data.saldo_origen,'100.00');assert.equal(ok.data.data.saldo_destino,'90.00');assert.equal(ok.data.data.tasa,'0.900000000000');assert.equal(ok.data.data.tasa_fuente,fx.FUENTE);
 assert.equal((await request(`/finanzas/carteras/${wallet.id}/conversion`,{method:'POST',token,body:{...body,confirmar:true}})).data.data.repetido,true);
 const after=(await finance.listWallets(u.id)).find(w=>w.id===wallet.id);assert.equal(after.moneda,'EUR');assert.equal(after.saldo_actual,'90.00');
 assert.equal((await db.query('SELECT moneda,monto::text FROM movimientos WHERE id=$1',[oldMovement])).rows[0].moneda,'USD');
 assert.equal((await request(`/finanzas/carteras/${wallet.id}/conversiones`,{token})).data.data.length,1);
 // El movimiento anterior queda como historial: ni editar ni anular (evita restar USD de un saldo EUR).
 await assert.rejects(ledger.remove(oldMovement,u.id),{status:409,message:/moneda distinta/});
 await assert.rejects(ledger.edit(oldMovement,u.id,{monto:50,cuenta_origen:'Viajes',categoria:'Otros'}),{status:409,message:/moneda distinta/});
 // Y la base lo impide aunque se salte la capa de servicio.
 await assert.rejects(db.query('UPDATE movimientos SET deleted_at=NOW() WHERE id=$1',[oldMovement]),{code:'P0001'});
 assert.equal((await finance.listWallets(u.id)).find(w=>w.id===wallet.id).saldo_actual,'90.00');
 // Nuevos movimientos de la cartera ya van en EUR.
 await ledger.create({usuario_id:u.id,tipo:'GASTO',monto:10,cuenta_origen:'Viajes'});
 assert.equal((await db.query('SELECT moneda FROM movimientos WHERE cuenta_origen_id=$1 ORDER BY id DESC LIMIT 1',[wallet.id])).rows[0].moneda,'EUR');
 // Bloqueos explicados.
 const goal=await finance.createGoal(u.id,{nombre:'Ahorro',objetivo:50});
 assert.equal((await request(`/finanzas/carteras/${goal.cuenta_id}/conversion?moneda=EUR`,{token})).data.code,'CARTERA_META');
 const rec=await finance.createWallet(u.id,{nombre:'Con recordatorio'});
 await finance.saveRecurring(u.id,{nombre:'Luz',tipo:'GASTO',monto:5,categoria_id:cat,cuenta_id:rec.id,frecuencia:'MENSUAL',proxima_fecha:today()});
 assert.equal((await request(`/finanzas/carteras/${rec.id}/conversion?moneda=EUR`,{token})).data.code,'CARTERA_CON_RECURRENTES');
 assert.equal((await request(`/finanzas/carteras/${wallet.id}/conversion?moneda=COP`,{token})).data.code,'SIN_TASA');
 assert.equal((await request(`/finanzas/carteras/${wallet.id}/conversion?moneda=EUR`,{token})).data.code,'MISMA_MONEDA');
});

test('presupuestos, deudas y metas respetan la moneda de cada registro',async()=>{
 await rates(daysAgo(1),{EUR:'0.8',MXN:'20'});
 const u=await user('USD'),token=sign(u.id),month=today().slice(0,7);
 const usd=await finance.createWallet(u.id,{nombre:'USD',saldo_inicial:500});
 const eur=await finance.createWallet(u.id,{nombre:'EUR',moneda:'EUR',saldo_inicial:500});
 const cop=await finance.createWallet(u.id,{nombre:'COP',moneda:'COP',saldo_inicial:500});
 const budget=await finance.createBudget(u.id,{categoria_id:cat,mes:month,limite:100});assert.equal(budget.moneda,'USD');
 await spend(u.id,usd.id,1000,today());await spend(u.id,eur.id,800,today());await spend(u.id,cop.id,5000,today());
 const [b]=await finance.listBudgets(u.id,month);
 assert.equal(b.gastado,'20.00'); // 10 USD + 8 EUR/0.8
 assert.deepEqual(b.gastado_sin_tasa,[{moneda:'COP',monto:'50.00'}]);assert.equal(b.porcentaje,20);
 const eurBudget=await finance.createBudget(u.id,{categoria_id:(await db.query("INSERT INTO categorias(nombre,usuario_id) VALUES('Viaje',$1) RETURNING id",[u.id])).rows[0].id,mes:month,limite:100,moneda:'EUR'});
 assert.equal(eurBudget.moneda,'EUR');
 await assert.rejects(db.query("UPDATE fin_presupuestos SET moneda='USD' WHERE id=$1",[eurBudget.id]),{code:'P0001'});
 // Deuda en EUR: solo se abona desde una cartera en EUR.
 const debt=await finance.createDebt(u.id,{nombre:'Préstamo',contraparte:'Persona',tipo:'PAGAR',monto:50,moneda:'EUR'});
 assert.equal(debt.moneda,'EUR');
 await assert.rejects(finance.addPayment(u.id,debt.id,{monto:10,cuenta_id:usd.id,idempotencia:'debt-pay-0001'}),{code:'MONEDA_DISTINTA'});
 await finance.addPayment(u.id,debt.id,{monto:10,cuenta_id:eur.id,idempotencia:'debt-pay-0002'});
 assert.equal((await finance.listDebts(u.id))[0].pendiente,'40.00');
 // Meta en EUR con aporte desde USD: exige la tasa confirmada y abona el importe convertido.
 const goal=await finance.createGoal(u.id,{nombre:'Viaje',objetivo:100,moneda:'EUR'});
 await assert.rejects(finance.addContribution(u.id,goal.id,{monto:50,cuenta_id:usd.id,idempotencia:'goal-add-0001'}),{code:'CONFIRMACION_REQUERIDA'});
 await finance.addContribution(u.id,goal.id,{monto:50,cuenta_id:usd.id,idempotencia:'goal-add-0001',confirmar:true,tasa:'0.8'});
 const g=(await finance.listGoals(u.id)).find(x=>x.id===goal.id);assert.equal(g.moneda,'EUR');assert.equal(g.ahorrado,'40.00');assert.equal(g.porcentaje,40);
 const [contribution]=await finance.listContributions(u.id,goal.id);assert.equal(contribution.moneda,'USD');assert.equal(contribution.monto_destino,'40.00');
 await assert.rejects(finance.addContribution(u.id,goal.id,{monto:100,cuenta_id:usd.id,idempotencia:'goal-add-0002',confirmar:true,tasa:'0.8'}),{status:409});
 // Recordatorio: confirma en la moneda de su cartera.
 const rec=await finance.saveRecurring(u.id,{nombre:'Suscripción',tipo:'GASTO',monto:5,categoria_id:cat,cuenta_id:eur.id,frecuencia:'MENSUAL',proxima_fecha:today()});
 assert.equal(rec.moneda,'EUR');
 const listed=(await request('/finanzas/recurrentes',{token})).data.data.find(r=>r.id===rec.id);assert.equal(listed.moneda_cuenta,'EUR');
});
