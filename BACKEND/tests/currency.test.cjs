'use strict';
process.env.DB_ENGINE='pglite';
process.env.PGLITE_DATA_DIR='memory://';
process.env.NODE_ENV='test';
process.env.JWT_SECRET='isolated-currency-test-only-secret-value';
process.env.REFRESH_JWT_SECRET='isolated-currency-test-only-refresh-secret';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
const db=require('../src/config/db');
const {initialize}=require('../scripts/init-local');
const currency=require('../src/finance/currency');
const finance=require('../src/finance/service');
const ledger=require('../src/services/ledgerService');
let server,url,cat,adminToken,sequence=0;
const sign=id=>jwt.sign({id,version:0},process.env.JWT_SECRET,{expiresIn:'5m'});
async function user(moneda='USD') {
 const n=++sequence;
 return (await db.query('INSERT INTO usuarios(nombre,correo,moneda) VALUES($1,$2,$3) RETURNING *',[`Moneda ${n}`,`moneda${n}@example.test`,moneda])).rows[0];
}
async function request(route,{method='GET',body,token=adminToken}={}) {
 const res=await fetch(url+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await res.text();
 return {status:res.status,headers:res.headers,data:res.headers.get('content-type')?.includes('json')?JSON.parse(text):text};
}
before(async()=>{
 await initialize();
 cat=(await db.query("SELECT id FROM categorias WHERE nombre='Otros' AND usuario_id IS NULL")).rows[0].id;
 const admin=await user();await db.query("UPDATE usuarios SET rol='ADMIN' WHERE id=$1",[admin.id]);adminToken=sign(admin.id);
 server=require('../src/app').listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}/api`;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await db.pool.end();});

test('registro conserva COP/MXN, USD por defecto y rechaza monedas fuera del catálogo',async()=>{
 for(const moneda of ['COP','MXN',undefined]) {
  const correo=`registro${++sequence}@example.test`;
  const reg=await request('/auth/registro',{method:'POST',token:null,body:{nombre:'Persona Moneda',correo,password:'RegistroSeguro2026!',...(moneda?{moneda}:{})}});
  assert.equal(reg.status,201,JSON.stringify(reg.data));
  const login=await request('/auth/login',{method:'POST',token:null,body:{correo,password:'RegistroSeguro2026!'}});
  assert.equal(login.data.usuario.moneda,moneda||'USD');
  const profile=await request('/usuarios/me/perfil',{token:login.data.token});
  assert.equal(profile.data.moneda,moneda||'USD');
 }
 const bad=await request('/auth/registro',{method:'POST',token:null,body:{nombre:'Inválido',correo:'invalido@example.test',password:'RegistroSeguro2026!',moneda:'ZZZ'}});
 assert.equal(bad.status,400);
});

test('preferencias están autenticadas, aisladas por usuario y no convierten cifras',async()=>{
 const a=await user('COP'),b=await user('MXN');
 assert.equal((await request('/finanzas/preferencias',{token:null})).status,401);
 const empty=await finance.createWallet(a.id,{nombre:'Sin movimientos',saldo_inicial:0});
 const before=await request('/finanzas/preferencias',{token:sign(a.id)});
 assert.equal(before.data.data.puede_cambiar,true);
 assert.deepEqual(before.data.data.monedas.map(m=>m.codigo),['USD','COP','MXN','EUR','PEN','ARS','CLP']);
 const changed=await request('/finanzas/preferencias',{method:'PATCH',token:sign(a.id),body:{moneda:'PEN',usuario_id:b.id}});
 assert.equal(changed.status,200);assert.equal(changed.data.data.moneda,'PEN');
 assert.equal((await currency.getPreferences(b.id)).moneda,'MXN');
 assert.equal((await finance.listWallets(a.id)).find(w=>w.id===empty.id).saldo_actual,'0.00');
 for(const body of [{},{moneda:'cop'},{moneda:null},{moneda:123}])assert.equal((await request('/finanzas/preferencias',{method:'PATCH',token:sign(a.id),body})).status,400);
});

// v3 (multidivisa): la moneda del usuario es de presentación. Cambiarla nunca reetiqueta importes.
test('la moneda de presentación cambia con actividad en todos los módulos sin reetiquetar importes',async()=>{
 const u=await user('COP');
 const wallet=await finance.createWallet(u.id,{nombre:'Apertura',saldo_inicial:20});
 await ledger.create({usuario_id:u.id,tipo:'INGRESO',monto:20,cuenta_origen:'Efectivo'});
 await finance.createBudget(u.id,{categoria_id:cat,mes:'2026-10',limite:20});
 await finance.saveRecurring(u.id,{nombre:'Fijo',tipo:'GASTO',monto:20,categoria_id:cat,cuenta_id:(await finance.createWallet(u.id,{nombre:'Vacía'})).id,frecuencia:'MENSUAL',proxima_fecha:'2026-10-01'});
 await finance.createDebt(u.id,{nombre:'Deuda',contraparte:'Persona',tipo:'PAGAR',monto:20});
 await finance.createGoal(u.id,{nombre:'Meta',objetivo:20});
 await finance.createGroup(u.id,{nombre:'Grupo'});
 assert.equal((await currency.getPreferences(u.id)).puede_cambiar,true);
 assert.equal((await currency.updatePreferences(u.id,{moneda:'USD'})).moneda,'USD');
 for(const table of ['cuentas','movimientos','fin_presupuestos','fin_recurrentes','fin_deudas','fin_metas']) {
  const r=(await db.query(`SELECT DISTINCT moneda FROM ${table} WHERE usuario_id=$1`,[u.id])).rows.map(x=>x.moneda);
  assert.deepEqual(r,['COP'],table);
 }
 assert.equal((await db.query('SELECT moneda FROM fin_grupos WHERE propietario_id=$1',[u.id])).rows[0].moneda,'COP');
 assert.equal((await finance.listWallets(u.id)).find(w=>w.id===wallet.id).saldo_actual,'20.00');
 // Una cartera con actividad no cambia de moneda por SQL directo: solo mediante conversión.
 await assert.rejects(db.query("UPDATE cuentas SET moneda='USD' WHERE id=$1",[wallet.id]),{code:'P0001'});
});

test('operación rechazada revierte también el bloqueo de moneda',async()=>{
 const u=await user('COP');
 await assert.rejects(ledger.create({usuario_id:u.id,tipo:'GASTO',monto:10,cuenta_origen:'Vacía'}),{status:409});
 assert.equal((await currency.getPreferences(u.id)).puede_cambiar,true);
 assert.equal((await currency.updatePreferences(u.id,{moneda:'MXN'})).moneda,'MXN');
});

test('preferencia y primera actividad concurrentes terminan ambas; la deuda conserva su moneda',async()=>{
 const u=await user('COP');
 const activity=db.withTransaction(async c=>{
  await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[u.id]);
  await c.query("INSERT INTO fin_deudas(usuario_id,nombre,contraparte,tipo,monto) VALUES($1,'Primera','Persona','PAGAR',25)",[u.id]);
 });
 const change=currency.updatePreferences(u.id,{moneda:'USD'});
 const results=await Promise.allSettled([activity,change]);
 assert.deepEqual(results.map(r=>r.status),['fulfilled','fulfilled']);
 assert.equal((await currency.getPreferences(u.id)).moneda,'USD');
 const [debt]=await finance.listDebts(u.id);assert.equal(debt.monto,'25.00');assert.equal(debt.moneda,'COP');
});

test('grupos llevan su propia moneda contable; los miembros pueden presentar en otra',async()=>{
 const owner=await user('COP'),same=await user('COP'),other=await user('MXN');
 const group=await finance.createGroup(owner.id,{nombre:'Compartido COP'});assert.equal(group.moneda,'COP');
 await finance.addMember(owner.id,group.id,{correo:same.correo});
 await finance.addMember(owner.id,group.id,{correo:other.correo});
 await assert.rejects(db.query('UPDATE fin_grupos SET moneda=$1 WHERE id=$2',['MXN',group.id]),{code:'P0001'});
 const eur=await finance.createGroup(other.id,{nombre:'Viaje EUR',moneda:'EUR'});assert.equal(eur.moneda,'EUR');
 await assert.rejects(finance.createGroup(other.id,{nombre:'Inválido',moneda:'ZZZ'}),{status:400});
 await finance.groupExpense(owner.id,group.id,{monto:10.01,descripcion:'Reparto',idempotencia:'currency-expense-001'});
 const detail=await finance.groupDetail(owner.id,group.id);
 assert.equal(detail.grupo.moneda,'COP');assert.equal(detail.gastos[0].monto,'10.01');assert.equal(detail.miembros.length,3);
});

test('administración separa COP de USD y conserva etiqueta en todas las familias de reportes',async()=>{
 const cop=await user('COP'),usd=await user('USD');
 await finance.createWallet(cop.id,{nombre:'Prueba de informe',saldo_inicial:12345});
 await finance.createWallet(usd.id,{nombre:'Prueba de informe',saldo_inicial:67});
 // v3: el oráculo agrupa por la moneda de cada cartera (ya no por la del usuario).
 const expected=Number((await db.query("SELECT SUM(saldo_actual) AS total FROM cuentas WHERE moneda='COP' AND deleted_at IS NULL")).rows[0].total);
 const dashboard=await request('/reportes/web/dashboard-admin?moneda=COP');
 assert.equal(dashboard.status,200,JSON.stringify(dashboard.data));assert.equal(dashboard.data.data.moneda,'COP');assert.equal(dashboard.data.data.kpis.balanceGlobal.valor,expected);
 assert.ok(dashboard.data.data.actividadReciente.ultimosMovimientos.every(m=>m.usuario_id!==usd.id));
 const defaults=await request('/reportes/web/dashboard-admin');assert.equal(defaults.data.data.moneda,'USD');
 for(const type of ['ingresos-mensuales','gastos-mensuales','balance-mensual','balance-anual','top-usuarios','top-categorias','movimientos-usuario','movimientos-fecha','comparativas']) {
  const r=await request(`/reportes/admin/generar?tipo=${type}&moneda=COP&anio=${new Date().getFullYear()}`);
  assert.equal(r.status,200,`${type}: ${JSON.stringify(r.data)}`);assert.equal(r.data.data.moneda,'COP');assert.equal(r.data.data.resumen.moneda,'COP');
  if(type.startsWith('movimientos'))assert.ok(r.data.data.datos.every(m=>m.moneda==='COP'));
  if(type==='top-usuarios')assert.ok(r.data.data.datos.every(m=>m.id!==usd.id));
 }
 const stats=await request(`/usuarios/${cop.id}/estadisticas`);assert.equal(stats.data.data.moneda,'COP');
 const wallets=await request(`/usuarios/${cop.id}/cuentas`);assert.equal(wallets.data.data.moneda,'COP');
 assert.equal((await request('/reportes/web/dashboard-admin?moneda=ZZZ')).status,400);
});

test('movimientos globales y exportaciones incluyen moneda, sin mezclar filas',async()=>{
 const list=await request('/movimientos/admin/todos?moneda=COP');
 assert.equal(list.status,200);assert.equal(list.data.moneda,'COP');assert.ok(list.data.data.length>0);assert.ok(list.data.data.every(m=>m.moneda==='COP'));
 const csv=await request('/movimientos/admin/exportar?moneda=COP');
 assert.equal(csv.status,200);assert.equal(csv.headers.get('x-currency'),'COP');assert.match(csv.data,/Moneda/);assert.match(csv.data,/COP/);assert.doesNotMatch(csv.data,/USD|MXN/);
 const report=await request('/reportes/admin/exportar?tipo=balance-mensual&moneda=COP&formato=csv');
 assert.equal(report.status,200);assert.equal(report.headers.get('x-currency'),'COP');assert.match(report.data,/Moneda/);assert.match(report.data,/COP/);
 const regular=await user('COP');assert.equal((await request('/movimientos/admin/todos?moneda=COP',{token:sign(regular.id)})).status,403);
});

test('rutas históricas Telegram exigen sesión e ignoran identificadores ajenos',async()=>{
 const current=await user('MXN'),other=await user('USD');
 await db.query('UPDATE usuarios SET telegram_id=991234567 WHERE id=$1',[other.id]);
 await finance.createWallet(current.id,{nombre:'Propia',saldo_inicial:9});
 await finance.createWallet(other.id,{nombre:'Ajena',saldo_inicial:987654});
 for(const route of ['hoy','mes','balance','categorias']) {
  assert.equal((await request(`/reportes/telegram/${route}?telegram_id=991234567`,{token:null})).status,401);
  const legacy=await request(`/reportes/telegram/${route}?telegram_id=991234567`,{token:sign(current.id)});
  const web=await request(`/reportes/web/${route}`,{token:sign(current.id)});
  assert.equal(legacy.status,200);assert.deepEqual(legacy.data,web.data);assert.doesNotMatch(JSON.stringify(legacy.data),/987654/);
 }
});
