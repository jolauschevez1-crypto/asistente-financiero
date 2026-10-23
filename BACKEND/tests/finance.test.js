'use strict';
process.env.DB_ENGINE='pglite';process.env.PGLITE_DATA_DIR='memory://';
const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const db=require('../src/config/db');const f=require('../src/finance/service');const v=require('../src/finance/validation');
let u1,u2,u3,cat,wallet;
before(async()=>{
 // Real PostgreSQL engine in isolated memory; no mocks, network, or user database.
 await require('../scripts/init-local').initialize();
 [u1,u2,u3]=(await db.query("INSERT INTO usuarios(nombre,correo) VALUES('Ana','ana@example.test'),('Luis','luis@example.test'),('Eva','eva@example.test') RETURNING id")).rows.map(r=>r.id);
 cat=(await db.query("SELECT id FROM categorias WHERE nombre='Otros' AND usuario_id IS NULL")).rows[0].id;
 wallet=await f.createWallet(u1,{nombre:'Principal',saldo_inicial:'1000.00'});
});
after(()=>db.pool.end());
test('validación de importes y fechas rechaza exceso, exponentes, blancos y fechas imposibles',()=>{
 for(const val of ['1.001','-2','1e3','NaN','',null,{},'1000000000','0'])assert.throws(()=>v.cents(val));
 assert.equal(v.cents('999999999.99'),99999999999);assert.equal(v.money(1001),'10.01');assert.throws(()=>v.date('2026-02-30'));assert.throws(()=>v.month('2026-13'));
 assert.equal(v.nextDate('2025-01-31','MENSUAL',31,1),'2025-02-28');assert.equal(v.nextDate('2025-02-28','MENSUAL',31,1),'2025-03-31');assert.equal(v.nextDate('2024-02-29','ANUAL',29,2),'2025-02-28');
});
test('apertura tiene ingreso trazable en destino y aislamiento entre propietarios',async()=>{
 const m=(await db.query("SELECT m.*,v.modulo FROM movimientos m JOIN fin_movimiento_vinculos v ON v.movimiento_id=m.id WHERE modulo='apertura'")).rows[0];assert.equal(m.cuenta_origen_id,null);assert.equal(m.cuenta_destino_id,wallet.id);assert.equal(m.monto,'1000.00');assert.deepEqual(await f.listWallets(u2),[]);
});
test('presupuestos únicos, propiedad y categoría privada se validan',async()=>{
 const p=await f.createBudget(u1,{categoria_id:cat,mes:'2026-10',limite:'50.00'});assert.equal((await f.listBudgets(u1,'2026-10'))[0].restante,'50.00');
 await assert.rejects(()=>f.updateBudget(u2,p.id,{limite:'1'}),{status:404});await assert.rejects(()=>f.createBudget(u1,{categoria_id:cat,mes:'2026-10',limite:20}),{code:'23505'});
 const privateCat=(await db.query("INSERT INTO categorias(nombre,usuario_id) VALUES('Privada',$1) RETURNING id",[u2])).rows[0].id;await assert.rejects(()=>f.createBudget(u1,{categoria_id:privateCat,mes:'2026-10',limite:20}),{status:404});
});
test('recurrencia es recordatorio hasta confirmar; concurrencia crea un solo gasto y conserva ancla mensual',async()=>{
 const before=(await f.listWallets(u1)).find(w=>w.id===wallet.id).saldo_actual;
 const r=await f.saveRecurring(u1,{nombre:'Servicio',tipo:'GASTO',monto:'20',categoria_id:cat,cuenta_id:wallet.id,frecuencia:'MENSUAL',proxima_fecha:'2025-01-31'});
 assert.equal((await f.listWallets(u1)).find(w=>w.id===wallet.id).saldo_actual,before);
 const results=await Promise.all([f.confirmRecurring(u1,r.id,{fecha_prevista:'2025-01-31',confirmar:true}),f.confirmRecurring(u1,r.id,{fecha_prevista:'2025-01-31',confirmar:true})]);
 assert.equal(results[0].movimiento_id,results[1].movimiento_id);assert.equal(results.filter(x=>x.repetido).length,1);assert.equal(results[0].proxima_fecha,'2025-02-28');
 const second=await f.confirmRecurring(u1,r.id,{fecha_prevista:'2025-02-28',confirmar:true});assert.equal(second.proxima_fecha,'2025-03-31');
 await assert.rejects(()=>f.confirmRecurring(u2,r.id,{fecha_prevista:'2025-03-31',confirmar:true}),{status:404});
});
test('confirmación exige consentimiento, vencimiento y saldo; ingreso usa destino',async()=>{
 const poor=await f.createWallet(u1,{nombre:'Vacía'});const b={nombre:'Futuro',tipo:'GASTO',monto:'1',categoria_id:cat,cuenta_id:poor.id,frecuencia:'SEMANAL',proxima_fecha:'2099-01-01'};const future=await f.saveRecurring(u1,b);
 await assert.rejects(()=>f.confirmRecurring(u1,future.id,{fecha_prevista:'2099-01-01',confirmar:true}),{status:409});
 const r=await f.saveRecurring(u1,{...b,proxima_fecha:'2025-01-01'});await assert.rejects(()=>f.confirmRecurring(u1,r.id,{fecha_prevista:'2025-01-01',confirmar:false}),{status:400});await assert.rejects(()=>f.confirmRecurring(u1,r.id,{fecha_prevista:'2025-01-01',confirmar:true}),{code:'SALDO_INSUFICIENTE'});
 const inc=await f.saveRecurring(u1,{...b,tipo:'INGRESO',proxima_fecha:'2025-01-01'});const c=await f.confirmRecurring(u1,inc.id,{fecha_prevista:'2025-01-01',confirmar:true});const m=(await db.query('SELECT * FROM movimientos WHERE id=$1',[c.movimiento_id])).rows[0];assert.equal(m.cuenta_destino_id,poor.id);assert.equal(m.cuenta_origen_id,null);
});
test('deudas no alteran cartera al crearse; abono concurrente idempotente y nunca sobrepaga',async()=>{
 const before=(await f.listWallets(u1)).find(w=>w.id===wallet.id).saldo_actual;const d=await f.createDebt(u1,{nombre:'Equipo',contraparte:'Tienda',tipo:'PAGAR',monto:100});assert.equal((await f.listWallets(u1)).find(w=>w.id===wallet.id).saldo_actual,before);
 const req={monto:'60',cuenta_id:wallet.id,idempotencia:'deuda-prueba-001'};const rr=await Promise.all([f.addPayment(u1,d.id,req),f.addPayment(u1,d.id,req)]);assert.equal(rr[0].movimiento_id,rr[1].movimiento_id);
 await assert.rejects(()=>f.addPayment(u1,d.id,{...req,monto:61}),{code:'IDEMPOTENCIA_CONFLICTO'});
 await assert.rejects(()=>f.addPayment(u1,d.id,{...req,monto:41,idempotencia:'deuda-prueba-002'}),{status:409});await assert.rejects(()=>f.addPayment(u2,d.id,req),{status:404});await assert.rejects(()=>f.deleteDebt(u1,d.id),{status:409});
 assert.equal((await f.listDebts(u1)).find(x=>x.id===d.id).pendiente,'40.00');assert.equal((await f.listPayments(u1,d.id)).length,1);
});
test('concurrencia de dos pagos diferentes contra cartera no permite saldo negativo',async()=>{
 const w=await f.createWallet(u1,{nombre:'Carrera',saldo_inicial:100});const d=await f.createDebt(u1,{nombre:'Carrera',contraparte:'A',tipo:'PAGAR',monto:160});const rr=await Promise.allSettled([f.addPayment(u1,d.id,{monto:80,cuenta_id:w.id,idempotencia:'carrera-0001'}),f.addPayment(u1,d.id,{monto:80,cuenta_id:w.id,idempotencia:'carrera-0002'})]);assert.equal(rr.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.listWallets(u1)).find(x=>x.id===w.id).saldo_actual,'20.00');assert.equal((await f.listPayments(u1,d.id)).length,1);
});
test('cobro aumenta destino; cartera ajena nunca se puede usar',async()=>{
 const d=await f.createDebt(u2,{nombre:'Préstamo',contraparte:'Ana',tipo:'COBRAR',monto:20});await assert.rejects(()=>f.addPayment(u2,d.id,{monto:10,cuenta_id:wallet.id,idempotencia:'cobrar-00001'}),{status:404});const w=await f.createWallet(u2,{nombre:'Luis'});const pay=await f.addPayment(u2,d.id,{monto:10,cuenta_id:w.id,idempotencia:'cobrar-00002'});const m=(await db.query('SELECT * FROM movimientos WHERE id=$1',[pay.movimiento_id])).rows[0];assert.equal(m.cuenta_destino_id,w.id);assert.equal((await f.listWallets(u2))[0].saldo_actual,'10.00');
});
test('meta usa transferencia, conserva total, impide exceso y repite sin duplicar',async()=>{
 const before=(await f.panel(u1,'2026-10')).saldo_total;const goal=await f.createGoal(u1,{nombre:'Laptop',objetivo:200});const req={monto:'100',cuenta_id:wallet.id,idempotencia:'aporte-prueba-001'};const r=await f.addContribution(u1,goal.id,req);const again=await f.addContribution(u1,goal.id,req);assert.equal(r.movimiento_id,again.movimiento_id);assert.equal(again.repetido,true);assert.equal((await f.panel(u1,'2026-10')).saldo_total,before);
 assert.equal((await f.listGoals(u1)).find(x=>x.id===goal.id).ahorrado,'100.00');await assert.rejects(()=>f.addContribution(u1,goal.id,{...req,monto:101,idempotencia:'aporte-prueba-002'}),{status:409});await assert.rejects(()=>f.addContribution(u2,goal.id,req),{status:404});await assert.rejects(()=>f.deleteGoal(u1,goal.id),{status:409});
});
test('grupos: propietario agrega miembros, permisos y reparto exacto de 10.01 en tres',async()=>{
 const g=await f.createGroup(u1,{nombre:'Viaje'});await f.addMember(u1,g.id,{correo:'luis@example.test'});await f.addMember(u1,g.id,{correo:'eva@example.test'});await assert.rejects(()=>f.addMember(u2,g.id,{correo:'ana@example.test'}),{status:403});
 const e=await f.groupExpense(u1,g.id,{descripcion:'Taxi',monto:'10.01',fecha:'2025-10-01',idempotencia:'gasto-grupo-001'});const repeat=await f.groupExpense(u1,g.id,{descripcion:'Taxi',monto:'10.01',fecha:'2025-10-01',idempotencia:'gasto-grupo-001'});assert.equal(repeat.id,e.id);assert.equal(repeat.repetido,true);
 const detail=await f.groupDetail(u1,g.id);assert.deepEqual(detail.gastos[0].participaciones.map(x=>x.monto),['3.34','3.34','3.33']);assert.deepEqual(detail.miembros.map(x=>x.saldo),['6.67','-3.34','-3.33']);assert.equal(detail.miembros.reduce((s,m)=>s+v.dbCents(m.saldo),0),0);
 const before=(await f.listWallets(u2))[0].saldo_actual;const payment=await f.settleGroup(u2,g.id,{hacia_id:u1,monto:'3.34',idempotencia:'liquidacion-001',confirmar:true});const repeatPay=await f.settleGroup(u2,g.id,{hacia_id:u1,monto:'3.34',idempotencia:'liquidacion-001',confirmar:true});assert.equal(payment.id,repeatPay.id);assert.equal((await f.listWallets(u2))[0].saldo_actual,before);assert.equal((await f.groupDetail(u2,g.id)).miembros.find(m=>m.id===u2).saldo,'0.00');
 await assert.rejects(()=>f.settleGroup(u2,g.id,{hacia_id:u1,monto:'0.01',idempotencia:'liquidacion-002',confirmar:true}),{status:409});
 const outsider=(await db.query("INSERT INTO usuarios(nombre,correo) VALUES('Externo','externo@example.test') RETURNING id")).rows[0].id;await assert.rejects(()=>f.groupDetail(outsider,g.id),{status:404});await assert.rejects(()=>f.groupExpense(outsider,g.id,{descripcion:'x',monto:1,idempotencia:'externo-0001'}),{status:404});
});
test('panel incluye todas las secciones y alerta con presupuesto consumido',async()=>{
 const b=await f.createBudget(u1,{categoria_id:cat,mes:'2025-01',limite:10});const p=await f.panel(u1,'2025-01');assert.equal(p.presupuestos.find(x=>x.id===b.id).gastado,'20.00');assert(p.alertas.some(a=>a.tipo==='peligro'));for(const field of ['carteras','presupuestos','recurrentes','deudas','metas','grupos','alertas'])assert(Array.isArray(p[field]));
});

test('los límites de mes se evalúan en hora de Ecuador',async()=>{
 const id=(await db.query("INSERT INTO usuarios(nombre,correo) VALUES('Límite de mes','mes@example.test') RETURNING id")).rows[0].id;
 const account=await f.createWallet(id,{nombre:'Calendario',saldo_inicial:100});
 await f.createBudget(id,{categoria_id:cat,mes:'2026-02',limite:50});
 await db.query("INSERT INTO movimientos(usuario_id,tipo_movimiento_id,categoria_id,cuenta_origen_id,monto,fecha) SELECT $1,id,$2,$3,10,'2026-03-01T02:00:00Z'::timestamptz FROM tipos_movimiento WHERE nombre='GASTO'",[id,cat,account.id]);
 assert.equal((await f.listBudgets(id,'2026-02'))[0].gastado,'10.00');
 assert.equal((await f.panel(id,'2026-02')).gastos,'10.00');
 const fixed=await f.saveRecurring(id,{nombre:'Inicio de marzo',tipo:'GASTO',monto:5,categoria_id:cat,cuenta_id:account.id,frecuencia:'MENSUAL',proxima_fecha:'2026-03-01'});
 const confirmed=await f.confirmRecurring(id,fixed.id,{confirmar:true,fecha_prevista:'2026-03-01'});
 const row=(await db.query("SELECT to_char(fecha AT TIME ZONE 'America/Guayaquil','YYYY-MM-DD') AS day FROM movimientos WHERE id=$1",[confirmed.movimiento_id])).rows[0];
 assert.equal(row.day,'2026-03-01');
});

test('editar el nombre de una recurrencia conserva el día ancla y rechaza fechas ya confirmadas',async()=>{
 const data={nombre:'Ancla original',tipo:'INGRESO',monto:1,categoria_id:cat,cuenta_id:wallet.id,frecuencia:'MENSUAL',proxima_fecha:'2025-01-31'};
 const r=await f.saveRecurring(u1,data);await f.confirmRecurring(u1,r.id,{fecha_prevista:'2025-01-31',confirmar:true});
 await f.saveRecurring(u1,{...data,nombre:'Nombre corregido',proxima_fecha:'2025-02-28'},r.id);
 assert.equal((await f.confirmRecurring(u1,r.id,{fecha_prevista:'2025-02-28',confirmar:true})).proxima_fecha,'2025-03-31');
 await assert.rejects(()=>f.saveRecurring(u1,{...data,proxima_fecha:'2025-01-31'},r.id),{status:409});
});

test('miembro inactivo conserva saldo histórico y deja de participar en gastos nuevos',async()=>{
 const inactive=(await db.query("INSERT INTO usuarios(nombre,correo) VALUES('Histórico','historico@example.test') RETURNING id")).rows[0].id;
 const g=await f.createGroup(u1,{nombre:'Histórico local'});await f.addMember(u1,g.id,{correo:'historico@example.test'});
 await f.groupExpense(u1,g.id,{descripcion:'Antes',monto:10,fecha:'2025-10-01',idempotencia:'historico-001'});
 await db.query('UPDATE usuarios SET deleted_at=NOW() WHERE id=$1',[inactive]);
 const after=await f.groupExpense(u1,g.id,{descripcion:'Después',monto:10,fecha:'2025-10-02',idempotencia:'historico-002'});
 const detail=await f.groupDetail(u1,g.id),old=detail.miembros.find(x=>x.id===inactive);
 assert.equal(old.activo,false);assert.equal(old.saldo,'-5.00');assert.deepEqual(detail.gastos.find(x=>x.id===after.id).participaciones,[{usuario_id:u1,monto:'10.00'}]);
 await assert.rejects(()=>f.addMember(u1,g.id,{correo:'historico@example.test'}),{status:404});
 assert.equal(detail.miembros.reduce((sum,x)=>sum+v.dbCents(x.saldo),0),0);
});

test('reintento de gasto con fecha automática conserva su operación aunque cambie el día',async()=>{
 const original=v.today,g=await f.createGroup(u1,{nombre:'Reintento de fecha'}),request={descripcion:'Almuerzo',monto:1,idempotencia:'fecha-idem-001'};
 try {
  v.today=()=> '2025-10-01';const first=await f.groupExpense(u1,g.id,request);
  v.today=()=> '2025-10-02';const second=await f.groupExpense(u1,g.id,request);
  assert.equal(first.id,second.id);assert.equal(second.repetido,true);assert.equal((await f.groupDetail(u1,g.id)).gastos.length,1);
  await assert.rejects(()=>f.groupExpense(u1,g.id,{...request,fecha:'2025-10-02'}),{code:'IDEMPOTENCIA_CONFLICTO'});
 } finally {v.today=original;}
});
