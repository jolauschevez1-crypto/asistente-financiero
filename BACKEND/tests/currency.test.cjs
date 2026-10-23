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
  const reg=await request('/auth/registro',{method:'POST',token:null,body:{nombre:'Registro de prueba',correo,password:'RegistroSeguro2026!',...(moneda?{moneda}:{})}});
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

test('todos los módulos fijan moneda y eliminar actividad no permite reinterpretar el historial',async()=>{
 const creators=[
  u=>finance.createWallet(u.id,{nombre:'Apertura',saldo_inicial:20}),
  u=>ledger.create({usuario_id:u.id,tipo:'INGRESO',monto:20,cuenta_origen:'Efectivo'}),
  u=>finance.createBudget(u.id,{categoria_id:cat,mes:'2026-10',limite:20}),
  async u=>finance.saveRecurring(u.id,{nombre:'Fijo',tipo:'GASTO',monto:20,categoria_id:cat,cuenta_id:(await finance.createWallet(u.id,{nombre:'Vacía'})).id,frecuencia:'MENSUAL',proxima_fecha:'2026-10-01'}),
  u=>finance.createDebt(u.id,{nombre:'Deuda',contraparte:'Persona',tipo:'PAGAR',monto:20}),
  u=>finance.createGoal(u.id,{nombre:'Meta',objetivo:20}),
  u=>finance.createGroup(u.id,{nombre:'Grupo'}),
 ];
 for(const create of creators) {
  const u=await user('COP');await create(u);
  assert.equal((await currency.getPreferences(u.id)).puede_cambiar,false);
  await assert.rejects(currency.updatePreferences(u.id,{moneda:'USD'}),{status:409,code:'MONEDA_BLOQUEADA'});
  assert.equal((await currency.updatePreferences(u.id,{moneda:'COP'})).moneda,'COP');
 }
 const u=await user('MXN'),debt=await finance.createDebt(u.id,{nombre:'Temporal',contraparte:'Persona',tipo:'PAGAR',monto:3});
 await finance.deleteDebt(u.id,debt.id);await initialize();
 assert.equal((await currency.getPreferences(u.id)).puede_cambiar,false);
 await assert.rejects(db.query('UPDATE usuarios SET moneda_fijada=FALSE,moneda=$1 WHERE id=$2',['USD',u.id]),{code:'P0001'});
});

test('operación rechazada revierte también el bloqueo de moneda',async()=>{
 const u=await user('COP');
 await assert.rejects(ledger.create({usuario_id:u.id,tipo:'GASTO',monto:10,cuenta_origen:'Vacía'}),{status:409});
 assert.equal((await currency.getPreferences(u.id)).puede_cambiar,true);
 assert.equal((await currency.updatePreferences(u.id,{moneda:'MXN'})).moneda,'MXN');
});

test('preferencia y primera actividad concurrentes se serializan; nunca se relabelan importes existentes',async()=>{
 const u=await user('COP');
 const activity=db.withTransaction(async c=>{
  await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[u.id]);
  await c.query("INSERT INTO fin_deudas(usuario_id,nombre,contraparte,tipo,monto) VALUES($1,'Primera','Persona','PAGAR',25)",[u.id]);
 });
 const change=currency.updatePreferences(u.id,{moneda:'USD'});
 const results=await Promise.allSettled([activity,change]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');
 assert.equal(results[1].reason.status,409);assert.equal((await currency.getPreferences(u.id)).moneda,'COP');
 assert.equal((await finance.listDebts(u.id))[0].monto,'25.00');
});

test('grupos conservan divisa y rechazan mezcla tanto en API como en SQL directo',async()=>{
 const owner=await user('COP'),same=await user('COP'),other=await user('MXN');
 const group=await finance.createGroup(owner.id,{nombre:'Compartido COP'});assert.equal(group.moneda,'COP');
 await finance.addMember(owner.id,group.id,{correo:same.correo});
 assert.equal((await currency.getPreferences(same.id)).puede_cambiar,false);
 await assert.rejects(finance.addMember(owner.id,group.id,{correo:other.correo}),{status:409,code:'MONEDA_GRUPO'});
 await assert.rejects(db.query('INSERT INTO fin_miembros(grupo_id,usuario_id) VALUES($1,$2)',[group.id,other.id]),{code:'P0001'});
 await assert.rejects(db.query('UPDATE fin_grupos SET moneda=$1 WHERE id=$2',['MXN',group.id]),{code:'P0001'});
 await finance.groupExpense(owner.id,group.id,{monto:10.01,descripcion:'Reparto',idempotencia:'currency-expense-001'});
 const detail=await finance.groupDetail(owner.id,group.id);
 assert.equal(detail.grupo.moneda,'COP');assert.equal(detail.gastos[0].monto,'10.01');
 assert.equal((await currency.getPreferences(other.id)).puede_cambiar,true);
});

test('administración separa COP de USD y conserva etiqueta en todas las familias de reportes',async()=>{
 const cop=await user('COP'),usd=await user('USD');
 await finance.createWallet(cop.id,{nombre:'Prueba de informe',saldo_inicial:12345});
 await finance.createWallet(usd.id,{nombre:'Prueba de informe',saldo_inicial:67});
 // Expected totals come from each owner's currency, not from the code under test.
 const expected=Number((await db.query("SELECT SUM(c.saldo_actual) AS total FROM cuentas c JOIN usuarios u ON u.id=c.usuario_id WHERE u.moneda='COP'")).rows[0].total);
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
