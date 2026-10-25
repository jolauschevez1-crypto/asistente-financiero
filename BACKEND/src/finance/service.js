'use strict';
const db=require('../config/db');
const v=require('./validation');
const currency=require('./currency');
const fx=require('./fx');
const mc=require('./multicurrency');
const rows=async(c,sql,p=[]) => (await c.query(sql,p)).rows;
const one=async(c,sql,p=[]) => (await rows(c,sql,p))[0];
const iso=x=>x instanceof Date?x.toISOString().slice(0,10):String(x).slice(0,10);
async function owned(c,table,uid,rid,lock=false){
 const allowed=['fin_presupuestos','fin_recurrentes','fin_deudas','fin_metas'];if(!allowed.includes(table))throw Error('Tabla no permitida');
 const r=await one(c,`SELECT * FROM ${table} WHERE id=$1 AND usuario_id=$2${lock?' FOR UPDATE':''}`,[v.id(rid),uid]);if(!r)v.fail('Registro no encontrado.',404,'NO_ENCONTRADO');return r;
}
async function category(c,uid,cid){const r=await one(c,'SELECT id FROM categorias WHERE id=$1 AND (usuario_id=$2 OR usuario_id IS NULL)',[v.id(cid),uid]);if(!r)v.fail('Categoría no disponible.',404);return r.id;}
async function accounts(c,uid,ids){
 const unique=[...new Set(ids.map(v.id))].sort((a,b)=>a-b);const result=[];
 for(const cid of unique){const r=await one(c,'SELECT * FROM cuentas WHERE id=$1 AND usuario_id=$2 AND deleted_at IS NULL FOR UPDATE',[cid,uid]);if(!r)v.fail('Cartera no disponible.',404);result.push(r);}return result;
}
// The account locks and ledger insert use the same connection and transaction.
// `conversion` ({monto_destino,tasa,tasa_fuente,tasa_fecha}) es obligatoria si las carteras usan
// monedas distintas; el destino recibe monto_destino y la fila conserva la tasa aplicada.
async function movement(c,uid,{tipo,monto,origen=null,destino=null,categoria=null,descripcion,modulo,referencia=null,fecha=null,conversion=null,monedas=null}){
 const accountRows=await accounts(c,uid,[origen,destino].filter(Boolean));const byId=new Map(accountRows.map(r=>[r.id,r]));
 if(origen&&destino&&origen===destino)v.fail('Selecciona carteras diferentes.');
 const cross=origen&&destino&&byId.get(origen).moneda!==byId.get(destino).moneda;
 if(cross&&!conversion)v.fail('Las carteras usan monedas distintas. Usa la transferencia con conversión.',409,'MONEDA_DISTINTA');
 if(!cross&&conversion)v.fail('La moneda de las carteras cambió. Revisa la operación.',409,'CARTERA_CAMBIADA');
 if(monedas&&((origen&&byId.get(origen).moneda!==monedas.origen)||(destino&&byId.get(destino).moneda!==monedas.destino)))v.fail('La moneda de las carteras cambió. Revisa la operación.',409,'CARTERA_CAMBIADA');
 if(origen&&v.dbCents(byId.get(origen).saldo_actual)<monto)v.fail('Saldo insuficiente en la cartera.',409,'SALDO_INSUFICIENTE');
 const type=await one(c,'SELECT id FROM tipos_movimiento WHERE nombre=$1',[tipo]);if(!type)v.fail('Tipo de movimiento no configurado.',503);
 const credit=conversion?conversion.monto_destino:monto;
 if(origen)await c.query('UPDATE cuentas SET saldo_actual=saldo_actual-$1 WHERE id=$2',[v.money(monto),origen]);
 if(destino)await c.query('UPDATE cuentas SET saldo_actual=saldo_actual+$1 WHERE id=$2',[v.money(credit),destino]);
 const m=await one(c,`INSERT INTO movimientos(usuario_id,tipo_movimiento_id,categoria_id,cuenta_origen_id,cuenta_destino_id,monto,descripcion,metodo_pago,fecha,monto_destino,tasa,tasa_fuente,tasa_fecha)
 VALUES($1,$2,$3,$4,$5,$6,$7,'LOCAL',COALESCE($8::date::timestamp AT TIME ZONE 'America/Guayaquil',CURRENT_TIMESTAMP),$9,$10,$11,$12) RETURNING id`,[uid,type.id,categoria,origen,destino,v.money(monto),descripcion,fecha,
  conversion?v.money(conversion.monto_destino):null,conversion?.tasa??null,conversion?.tasa_fuente??null,conversion?.tasa_fecha??null]);
 await c.query('INSERT INTO fin_movimiento_vinculos(movimiento_id,modulo,referencia_id) VALUES($1,$2,$3)',[m.id,modulo,referencia]);return m.id;
}
async function quickExpenses(uid,b){
 const entries=require('./quick-expenses').parseExpenses(b.texto),wallet=v.id(b.cuenta_id),key=v.key(b.idempotencia);
 const request=JSON.stringify({entries,wallet});
 return db.withTransaction(async c=>{
  await one(c,'SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[uid]);
  const prior=await one(c,'SELECT solicitud,resultado FROM fin_cargas_rapidas WHERE usuario_id=$1 AND idempotencia=$2',[uid,key]);
  if(prior){if(prior.solicitud!==request)v.fail('La clave ya fue usada con otros datos.',409,'IDEMPOTENCIA_CONFLICTO');return {...JSON.parse(prior.resultado),repetido:true};}
  const [account]=await accounts(c,uid,[wallet]);
  const total=entries.reduce((sum,e)=>sum+v.cents(e.monto),0);
  if(v.dbCents(account.saldo_actual)<total)v.fail('Saldo insuficiente para todos los gastos. No se guardó ninguno.',409,'SALDO_INSUFICIENTE');
  const cat=await one(c,"SELECT id FROM categorias WHERE nombre='Otros' AND usuario_id IS NULL ORDER BY id LIMIT 1");
  const ids=[];
  for(const e of entries)ids.push(await movement(c,uid,{tipo:'GASTO',monto:v.cents(e.monto),origen:wallet,categoria:cat?.id,descripcion:e.descripcion,modulo:'carga_rapida'}));
  const result={movimientos:ids,total:v.money(total),cantidad:ids.length};
  await c.query('INSERT INTO fin_cargas_rapidas(usuario_id,idempotencia,solicitud,resultado) VALUES($1,$2,$3,$4)',[uid,key,request,JSON.stringify(result)]);
  return {...result,repetido:false};
 });
}
async function listWallets(uid,c=db){return rows(c,'SELECT id,nombre,moneda,saldo_actual FROM cuentas WHERE usuario_id=$1 AND deleted_at IS NULL ORDER BY id',[uid]);}
// Moneda opcional de un registro nuevo: la indicada o, por defecto, la de presentación del usuario.
async function chosenCurrency(c,uid,value){if(value!==undefined&&value!==null&&value!=='')return currency.validate(value);return (await currency.getPreferences(uid,c)).moneda;}
async function listCategories(uid){return rows(db,'SELECT id,nombre FROM categorias WHERE usuario_id=$1 OR usuario_id IS NULL ORDER BY nombre,id',[uid]);}
async function createWallet(uid,b){const name=v.text(b.nombre),amount=v.cents(b.saldo_inicial??0,true);return db.withTransaction(async c=>{
 const moneda=await chosenCurrency(c,uid,b.moneda);
 const r=await one(c,'INSERT INTO cuentas(nombre,usuario_id,saldo_actual,moneda) VALUES($1,$2,0,$3) RETURNING id,nombre,moneda,saldo_actual',[name,uid,moneda]);
 if(amount){await movement(c,uid,{tipo:'INGRESO',monto:amount,destino:r.id,descripcion:`Saldo inicial: ${name}`,modulo:'apertura',referencia:r.id});r.saldo_actual=v.money(amount);}return r;
});}
// Gastos del mes por categoría, moneda y día: base para valorar en la moneda de cada presupuesto.
async function monthlySpend(uid,m,c=db){return rows(c,`SELECT mv.categoria_id,mv.moneda,(mv.fecha AT TIME ZONE 'America/Guayaquil')::date AS dia,SUM(mv.monto) AS total
 FROM movimientos mv JOIN tipos_movimiento t ON t.id=mv.tipo_movimiento_id WHERE mv.usuario_id=$1 AND t.nombre='GASTO' AND mv.deleted_at IS NULL
 AND to_char(mv.fecha AT TIME ZONE 'America/Guayaquil','YYYY-MM')=$2 GROUP BY 1,2,3`,[uid,m]);}
async function listBudgets(uid,month){const m=v.month(month||v.today().slice(0,7));const [rr,spend]=await Promise.all([rows(db,`SELECT p.*,cat.nombre AS categoria FROM fin_presupuestos p JOIN categorias cat ON cat.id=p.categoria_id
 WHERE p.usuario_id=$1 AND p.mes=$2 ORDER BY p.id`,[uid,m]),monthlySpend(uid,m)]);const out=[];
 for(const r of rr){const val=await mc.valuate(spend.filter(s=>s.categoria_id===r.categoria_id).map(s=>({moneda:s.moneda,dia:s.dia,cents:v.dbCents(s.total)})),r.moneda);
  out.push({...r,gastado:v.money(val.cents),gastado_sin_tasa:val.sin_tasa,fechas_tasa:val.fechas_tasa,restante:v.money(v.dbCents(r.limite)-val.cents),porcentaje:Math.round(val.cents/v.dbCents(r.limite)*10000)/100});}
 return out;}
async function createBudget(uid,b){const limit=v.cents(b.limite),m=v.month(b.mes);return db.withTransaction(async c=>{const cat=await category(c,uid,b.categoria_id);const moneda=await chosenCurrency(c,uid,b.moneda);return one(c,'INSERT INTO fin_presupuestos(usuario_id,categoria_id,mes,limite,moneda) VALUES($1,$2,$3,$4,$5) RETURNING *',[uid,cat,m,v.money(limit),moneda]);});}
async function updateBudget(uid,id,b){const limit=v.cents(b.limite);return db.withTransaction(async c=>{await owned(c,'fin_presupuestos',uid,id,true);return one(c,'UPDATE fin_presupuestos SET limite=$1 WHERE id=$2 RETURNING *',[v.money(limit),id]);});}
async function deleteBudget(uid,id){return db.withTransaction(async c=>{await owned(c,'fin_presupuestos',uid,id,true);await c.query('DELETE FROM fin_presupuestos WHERE id=$1',[id]);return {eliminado:true};});}
function recurrenceData(b){return {nombre:v.text(b.nombre),tipo:v.choice(b.tipo,['INGRESO','GASTO'],'Tipo'),monto:v.money(v.cents(b.monto)),categoria_id:v.id(b.categoria_id),cuenta_id:v.id(b.cuenta_id),frecuencia:v.choice(b.frecuencia,['SEMANAL','MENSUAL','ANUAL'],'Frecuencia'),proxima_fecha:v.date(b.proxima_fecha)};}
async function listRecurring(uid){const rr=await rows(db,`SELECT r.*,c.nombre AS cuenta,c.moneda AS moneda_cuenta,cat.nombre AS categoria FROM fin_recurrentes r JOIN cuentas c ON c.id=r.cuenta_id
 JOIN categorias cat ON cat.id=r.categoria_id WHERE r.usuario_id=$1 ORDER BY r.activo DESC,r.proxima_fecha,r.id`,[uid]);return rr.map(r=>({...r,proxima_fecha:iso(r.proxima_fecha),vencido:r.activo&&iso(r.proxima_fecha)<=v.today()}));}
async function saveRecurring(uid,b,id=null){const d=recurrenceData(b);return db.withTransaction(async c=>{
 let previous;
 if(id){previous=await owned(c,'fin_recurrentes',uid,id,true);if(await one(c,'SELECT id FROM fin_confirmaciones WHERE recurrente_id=$1 AND fecha_prevista=$2',[id,d.proxima_fecha]))v.fail('Esa fecha ya fue confirmada. Elige un vencimiento pendiente.',409);}
 await category(c,uid,d.categoria_id);await accounts(c,uid,[d.cuenta_id]);
 // Changing the label/amount must not turn a January-31 series into a day-28 series.
 const preserveAnchor=previous&&previous.frecuencia===d.frecuencia&&iso(previous.proxima_fecha)===d.proxima_fecha;
 const values=[uid,d.nombre,d.tipo,d.monto,d.categoria_id,d.cuenta_id,d.frecuencia,d.proxima_fecha,preserveAnchor?previous.dia_ancla:Number(d.proxima_fecha.slice(8)),preserveAnchor?previous.mes_ancla:Number(d.proxima_fecha.slice(5,7))];
 if(id){values.push(id);return one(c,`UPDATE fin_recurrentes SET nombre=$2,tipo=$3,monto=$4,categoria_id=$5,cuenta_id=$6,frecuencia=$7,proxima_fecha=$8,dia_ancla=$9,mes_ancla=$10
 WHERE usuario_id=$1 AND id=$11 RETURNING *`,values);}
 return one(c,`INSERT INTO fin_recurrentes(usuario_id,nombre,tipo,monto,categoria_id,cuenta_id,frecuencia,proxima_fecha,dia_ancla,mes_ancla)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,values);
});}
async function disableRecurring(uid,id){return db.withTransaction(async c=>{await owned(c,'fin_recurrentes',uid,id,true);await c.query('UPDATE fin_recurrentes SET activo=FALSE WHERE id=$1',[id]);return {desactivado:true};});}
async function confirmRecurring(uid,id,b){const date=v.date(b.fecha_prevista);if(b.confirmar!==true)v.fail('Debes confirmar el registro.');return db.withTransaction(async c=>{
 const r=await owned(c,'fin_recurrentes',uid,id,true);const prev=await one(c,'SELECT movimiento_id,proxima_fecha FROM fin_confirmaciones WHERE recurrente_id=$1 AND fecha_prevista=$2',[id,date]);
 if(prev)return {...prev,proxima_fecha:iso(prev.proxima_fecha),repetido:true};
 if(!r.activo)v.fail('El recordatorio está desactivado.',409);if(iso(r.proxima_fecha)!==date)v.fail('La fecha prevista cambió. Actualiza los recordatorios.',409,'FECHA_CAMBIADA');
 if(date>v.today())v.fail('El recordatorio todavía no vence.',409);
 const [wallet]=await accounts(c,uid,[r.cuenta_id]);if(wallet.moneda!==r.moneda)v.fail('La cartera del recordatorio cambió de moneda. Edita el importe antes de confirmarlo.',409,'MONEDA_DISTINTA');const next=v.nextDate(date,r.frecuencia,r.dia_ancla,r.mes_ancla);
 const movementId=await movement(c,uid,{tipo:r.tipo,monto:v.dbCents(r.monto),origen:r.tipo==='GASTO'?r.cuenta_id:null,destino:r.tipo==='INGRESO'?r.cuenta_id:null,categoria:r.categoria_id,descripcion:`Confirmación: ${r.nombre}`,modulo:'recurrente',referencia:r.id,fecha:date});
 await c.query('INSERT INTO fin_confirmaciones(recurrente_id,fecha_prevista,movimiento_id,proxima_fecha) VALUES($1,$2,$3,$4)',[r.id,date,movementId,next]);await c.query('UPDATE fin_recurrentes SET proxima_fecha=$1 WHERE id=$2',[next,r.id]);return {movimiento_id:movementId,proxima_fecha:next,repetido:false};
});}
async function listDebts(uid){const rr=await rows(db,`SELECT d.*,COALESCE((SELECT SUM(a.monto) FROM fin_abonos a WHERE a.deuda_id=d.id),0) AS pagado
 FROM fin_deudas d WHERE d.usuario_id=$1 ORDER BY d.id DESC`,[uid]);return rr.map(r=>{const pending=v.dbCents(r.monto)-v.dbCents(r.pagado);return {...r,fecha_vencimiento:r.fecha_vencimiento?iso(r.fecha_vencimiento):null,pendiente:v.money(pending),estado:pending===0?'PAGADA':'PENDIENTE'};});}
async function createDebt(uid,b){const data=[v.text(b.nombre),v.text(b.contraparte,'Contraparte'),v.choice(b.tipo,['PAGAR','COBRAR'],'Tipo'),v.money(v.cents(b.monto)),v.date(b.fecha_vencimiento,true)];const moneda=await chosenCurrency(db,uid,b.moneda);
 return one(db,`INSERT INTO fin_deudas(usuario_id,nombre,contraparte,tipo,monto,fecha_vencimiento,moneda) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[uid,...data,moneda]);}
function repeatPayment(prior,amount,account){if(v.dbCents(prior.monto)!==amount||prior.cuenta_id!==account)v.fail('La clave de operación ya fue usada con otros datos.',409,'IDEMPOTENCIA_CONFLICTO');return {...prior,repetido:true};}
async function addPayment(uid,id,b){const amount=v.cents(b.monto),account=v.id(b.cuenta_id),key=v.key(b.idempotencia);return db.withTransaction(async c=>{
 const d=await owned(c,'fin_deudas',uid,id,true);const prior=await one(c,'SELECT * FROM fin_abonos WHERE deuda_id=$1 AND idempotencia=$2',[id,key]);if(prior)return repeatPayment(prior,amount,account);
 const paid=await one(c,'SELECT COALESCE(SUM(monto),0) AS total FROM fin_abonos WHERE deuda_id=$1',[id]);if(amount>v.dbCents(d.monto)-v.dbCents(paid.total))v.fail('El abono supera el saldo pendiente.',409);
 const [wallet]=await accounts(c,uid,[account]);if(wallet.moneda!==d.moneda)v.fail(`La deuda está en ${d.moneda} y la cartera en ${wallet.moneda}. Elige una cartera en ${d.moneda}.`,409,'MONEDA_DISTINTA');
 const mid=await movement(c,uid,{tipo:d.tipo==='PAGAR'?'GASTO':'INGRESO',monto:amount,origen:d.tipo==='PAGAR'?account:null,destino:d.tipo==='COBRAR'?account:null,descripcion:`Abono: ${d.nombre}`,modulo:'deuda',referencia:d.id});
 return {...await one(c,'INSERT INTO fin_abonos(deuda_id,monto,cuenta_id,movimiento_id,idempotencia) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,v.money(amount),account,mid,key]),repetido:false};
});}
async function listPayments(uid,id){await owned(db,'fin_deudas',uid,id);return rows(db,'SELECT a.*,c.nombre AS cuenta,m.moneda FROM fin_abonos a JOIN cuentas c ON c.id=a.cuenta_id JOIN movimientos m ON m.id=a.movimiento_id WHERE deuda_id=$1 ORDER BY a.id DESC',[id]);}
async function deleteDebt(uid,id){return db.withTransaction(async c=>{await owned(c,'fin_deudas',uid,id,true);if(await one(c,'SELECT id FROM fin_abonos WHERE deuda_id=$1 LIMIT 1',[id]))v.fail('No puedes eliminar una deuda con abonos.',409);await c.query('DELETE FROM fin_deudas WHERE id=$1',[id]);return {eliminado:true};});}
async function listGoals(uid){const rr=await rows(db,`SELECT m.*,c.nombre AS cuenta,c.saldo_actual AS ahorrado FROM fin_metas m JOIN cuentas c ON c.id=m.cuenta_id WHERE m.usuario_id=$1 ORDER BY m.id DESC`,[uid]);return rr.map(r=>({...r,fecha_objetivo:r.fecha_objetivo?iso(r.fecha_objetivo):null,restante:v.money(Math.max(0,v.dbCents(r.objetivo)-v.dbCents(r.ahorrado))),porcentaje:Math.round(v.dbCents(r.ahorrado)/v.dbCents(r.objetivo)*10000)/100}));}
async function createGoal(uid,b){const name=v.text(b.nombre),objective=v.money(v.cents(b.objetivo)),date=v.date(b.fecha_objetivo,true);return db.withTransaction(async c=>{
 // Lock the owner to serialize duplicate-name selection without relying on timestamps.
 await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[uid]);let n=`Meta: ${name}`.slice(0,90),suffix=1;
 while(await one(c,'SELECT id FROM cuentas WHERE usuario_id=$1 AND nombre=$2',[uid,n]))n=`${`Meta: ${name}`.slice(0,82)} (${++suffix})`;
 const moneda=await chosenCurrency(c,uid,b.moneda);const wallet=await one(c,'INSERT INTO cuentas(usuario_id,nombre,saldo_actual,moneda) VALUES($1,$2,0,$3) RETURNING id',[uid,n,moneda]);return one(c,'INSERT INTO fin_metas(usuario_id,nombre,objetivo,fecha_objetivo,cuenta_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[uid,name,objective,date,wallet.id]);
});}
// Un aporte desde otra moneda se convierte con la tasa confirmada; el aporte guarda el importe de origen.
async function addContribution(uid,id,b){const amount=v.cents(b.monto),account=v.id(b.cuenta_id),key=v.key(b.idempotencia);
 const goal0=await owned(db,'fin_metas',uid,id);const src=await one(db,'SELECT moneda FROM cuentas WHERE id=$1 AND usuario_id=$2 AND deleted_at IS NULL',[account,uid]);if(!src)v.fail('Cartera no disponible.',404);
 const priorQuick=await one(db,'SELECT * FROM fin_aportes WHERE meta_id=$1 AND idempotencia=$2',[id,key]);if(priorQuick)return repeatPayment(priorQuick,amount,account);
 let q=null;if(src.moneda!==goal0.moneda){q=await mc.currentQuote(src.moneda,goal0.moneda);mc.checkConfirmed(b,q);}
 return db.withTransaction(async c=>{
 const goal=await owned(c,'fin_metas',uid,id,true);const prior=await one(c,'SELECT * FROM fin_aportes WHERE meta_id=$1 AND idempotencia=$2',[id,key]);if(prior)return repeatPayment(prior,amount,account);
 const accts=await accounts(c,uid,[account,goal.cuenta_id]);const target=accts.find(a=>a.id===goal.cuenta_id);if(account===goal.cuenta_id)v.fail('Elige otra cartera de origen.');
 const conversion=q?{monto_destino:fx.convertCents(amount,q.racional),tasa:q.tasa,tasa_fuente:q.fuente,tasa_fecha:q.fecha_cotizacion}:null;const credited=conversion?conversion.monto_destino:amount;
 if(credited+v.dbCents(target.saldo_actual)>v.dbCents(goal.objetivo))v.fail('El aporte supera el objetivo pendiente.',409);
 const mid=await movement(c,uid,{tipo:'TRANSFERENCIA',monto:amount,origen:account,destino:goal.cuenta_id,descripcion:`Aporte: ${goal.nombre}`,modulo:'meta',referencia:goal.id,conversion,monedas:{origen:src.moneda,destino:goal.moneda}});return {...await one(c,'INSERT INTO fin_aportes(meta_id,monto,cuenta_id,movimiento_id,idempotencia) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,v.money(amount),account,mid,key]),repetido:false};
});}
async function listContributions(uid,id){await owned(db,'fin_metas',uid,id);return rows(db,'SELECT a.*,c.nombre AS cuenta,m.moneda,m.monto_destino,m.moneda_destino,m.tasa,m.tasa_fecha FROM fin_aportes a JOIN cuentas c ON c.id=a.cuenta_id JOIN movimientos m ON m.id=a.movimiento_id WHERE meta_id=$1 ORDER BY a.id DESC',[id]);}
async function deleteGoal(uid,id){return db.withTransaction(async c=>{const goal=await owned(c,'fin_metas',uid,id,true);const [wallet]=await accounts(c,uid,[goal.cuenta_id]);if(v.dbCents(wallet.saldo_actual)!==0||await one(c,'SELECT id FROM fin_aportes WHERE meta_id=$1 LIMIT 1',[id]))v.fail('La meta tiene saldo o aportes; conserva su historial.',409);await c.query('DELETE FROM fin_metas WHERE id=$1',[id]);return {eliminado:true,cuenta_conservada:goal.cuenta_id};});}
async function groupAccess(c,uid,gid,lock=false){const r=await one(c,`SELECT g.* FROM fin_grupos g JOIN fin_miembros m ON m.grupo_id=g.id WHERE g.id=$1 AND m.usuario_id=$2${lock?' FOR UPDATE OF g':''}`,[v.id(gid),uid]);if(!r)v.fail('Grupo no encontrado.',404);return r;}
async function listGroups(uid){return rows(db,`SELECT g.*,(SELECT COUNT(*)::integer FROM fin_miembros WHERE grupo_id=g.id) AS miembros,
 COALESCE((SELECT SUM(monto) FROM fin_gastos_grupo WHERE grupo_id=g.id),0) AS total_gastos
 FROM fin_grupos g JOIN fin_miembros m ON m.grupo_id=g.id WHERE m.usuario_id=$1 ORDER BY g.id DESC`,[uid]);}
async function createGroup(uid,b){const name=v.text(b.nombre);return db.withTransaction(async c=>{const moneda=await chosenCurrency(c,uid,b.moneda);const g=await one(c,'INSERT INTO fin_grupos(nombre,propietario_id,moneda) VALUES($1,$2,$3) RETURNING *',[name,uid,moneda]);await c.query('INSERT INTO fin_miembros(grupo_id,usuario_id) VALUES($1,$2)',[g.id,uid]);return g;});}
async function addMember(uid,id,b){const email=v.text(b.correo,'Correo',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))v.fail('Correo no válido.');return db.withTransaction(async c=>{
 const g=await groupAccess(c,uid,id,true);if(g.propietario_id!==uid)v.fail('Solo el propietario puede agregar miembros.',403);
 // El grupo lleva su propia moneda contable; la moneda de presentación de cada miembro no influye.
 const u=await one(c,'SELECT id,nombre,correo FROM usuarios WHERE LOWER(correo)=$1 AND deleted_at IS NULL FOR UPDATE',[email]);if(!u)v.fail('No hay una cuenta local activa con ese correo.',404);
 await c.query('INSERT INTO fin_miembros(grupo_id,usuario_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,u.id]);return u;
});}
async function groupBalances(c,id){const members=await rows(c,'SELECT u.id,u.nombre,u.correo,(u.deleted_at IS NULL) AS activo FROM fin_miembros m JOIN usuarios u ON u.id=m.usuario_id WHERE grupo_id=$1 ORDER BY u.id',[id]);const balance=new Map(members.map(m=>[m.id,0]));
 const expenses=await rows(c,'SELECT id,pagador_id,monto FROM fin_gastos_grupo WHERE grupo_id=$1',[id]);for(const e of expenses)balance.set(e.pagador_id,balance.get(e.pagador_id)+v.dbCents(e.monto));
 const parts=await rows(c,'SELECT p.usuario_id,p.monto FROM fin_participaciones p JOIN fin_gastos_grupo g ON g.id=p.gasto_id WHERE g.grupo_id=$1',[id]);for(const p of parts)balance.set(p.usuario_id,balance.get(p.usuario_id)-v.dbCents(p.monto));
 const settlements=await rows(c,'SELECT * FROM fin_liquidaciones WHERE grupo_id=$1',[id]);for(const s of settlements){balance.set(s.desde_id,balance.get(s.desde_id)+v.dbCents(s.monto));balance.set(s.hacia_id,balance.get(s.hacia_id)-v.dbCents(s.monto));}
 return members.map(m=>({...m,saldo:v.money(balance.get(m.id))}));
}
async function groupDetail(uid,id){return db.withTransaction(async c=>{const group=await groupAccess(c,uid,id,true);const members=await groupBalances(c,id);const expenses=await rows(c,'SELECT * FROM fin_gastos_grupo WHERE grupo_id=$1 ORDER BY id DESC',[id]);for(const e of expenses){e.fecha=iso(e.fecha);e.participaciones=await rows(c,'SELECT usuario_id,monto FROM fin_participaciones WHERE gasto_id=$1 ORDER BY usuario_id',[e.id]);}return {grupo:group,miembros:members,gastos:expenses,liquidaciones:await rows(c,'SELECT * FROM fin_liquidaciones WHERE grupo_id=$1 ORDER BY id DESC',[id])};});}
async function groupExpense(uid,id,b){const explicitDate=b.fecha!=null&&b.fecha!=='';const amount=v.cents(b.monto),description=v.text(b.descripcion,'Descripción',250),date=v.date(explicitDate?b.fecha:v.today()),key=v.key(b.idempotencia);if(date>v.today())v.fail('La fecha del gasto no puede ser futura.');return db.withTransaction(async c=>{
 await groupAccess(c,uid,id,true);const prior=await one(c,'SELECT * FROM fin_gastos_grupo WHERE grupo_id=$1 AND pagador_id=$2 AND idempotencia=$3',[id,uid,key]);if(prior){if(v.dbCents(prior.monto)!==amount||prior.descripcion!==description||(explicitDate&&iso(prior.fecha)!==date))v.fail('La clave ya fue usada con otros datos.',409,'IDEMPOTENCIA_CONFLICTO');return {...prior,repetido:true};}
 // Keep historical balances of inactive members, but never charge them for new expenses.
 const members=await rows(c,'SELECT m.usuario_id FROM fin_miembros m JOIN usuarios u ON u.id=m.usuario_id WHERE m.grupo_id=$1 AND u.deleted_at IS NULL ORDER BY m.usuario_id',[id]);
 if(!members.some(m=>m.usuario_id===uid))v.fail('La cuenta que registra el gasto ya no está activa.',403);
 const expense=await one(c,'INSERT INTO fin_gastos_grupo(grupo_id,pagador_id,descripcion,monto,fecha,idempotencia) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,uid,description,v.money(amount),date,key]);const base=Math.floor(amount/members.length),remainder=amount%members.length;
 for(let i=0;i<members.length;i++)await c.query('INSERT INTO fin_participaciones(gasto_id,usuario_id,monto) VALUES($1,$2,$3)',[expense.id,members[i].usuario_id,v.money(base+(i<remainder?1:0))]);return {...expense,repetido:false};
});}
async function settleGroup(uid,id,b){const recipient=v.id(b.hacia_id),amount=v.cents(b.monto),key=v.key(b.idempotencia);if(b.confirmar!==true)v.fail('Confirma que el pago contable se realizó.');if(recipient===uid)v.fail('El destinatario debe ser otra persona.');return db.withTransaction(async c=>{
 await groupAccess(c,uid,id,true);const prior=await one(c,'SELECT * FROM fin_liquidaciones WHERE grupo_id=$1 AND desde_id=$2 AND idempotencia=$3',[id,uid,key]);if(prior){if(prior.hacia_id!==recipient||v.dbCents(prior.monto)!==amount)v.fail('La clave ya fue usada con otros datos.',409,'IDEMPOTENCIA_CONFLICTO');return {...prior,repetido:true};}
 const balances=await groupBalances(c,id),sender=balances.find(x=>x.id===uid),receiver=balances.find(x=>x.id===recipient);if(!receiver)v.fail('El destinatario no pertenece al grupo.',404);
 if(v.dbCents(sender.saldo)>=0||v.dbCents(receiver.saldo)<=0||amount>-v.dbCents(sender.saldo)||amount>v.dbCents(receiver.saldo))v.fail('El importe supera la deuda o el crédito vigentes.',409);
 return {...await one(c,'INSERT INTO fin_liquidaciones(grupo_id,desde_id,hacia_id,monto,idempotencia) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,uid,recipient,v.money(amount),key]),repetido:false};
});}
// Panel general en la moneda de presentación (la del usuario o `moneda` de la consulta).
// Saldos actuales: última tasa disponible, con su fecha y antigüedad. Flujos del mes: tasa de la
// fecha de cada movimiento. Lo que no tiene tasa se informa aparte y nunca se suma al total.
async function panel(uid,month,moneda){const m=v.month(month||v.today().slice(0,7));
 await fx.maybeRefresh();
 const base=moneda?currency.validate(moneda):(await currency.getPreferences(uid)).moneda;
 const [wallets,budgets,recurring,debts,goals,groups,flows,snap]=await Promise.all([listWallets(uid),listBudgets(uid,m),listRecurring(uid),listDebts(uid),listGoals(uid),listGroups(uid),
  rows(db,`SELECT t.nombre AS tipo,m.moneda,(m.fecha AT TIME ZONE 'America/Guayaquil')::date AS dia,SUM(m.monto) AS total FROM movimientos m JOIN tipos_movimiento t ON t.id=m.tipo_movimiento_id
   WHERE m.usuario_id=$1 AND m.deleted_at IS NULL AND t.nombre IN ('INGRESO','GASTO') AND to_char(m.fecha AT TIME ZONE 'America/Guayaquil','YYYY-MM')=$2 GROUP BY 1,2,3`,[uid,m]),fx.snapshot()]);
 const perCurrency=new Map();for(const w of wallets)perCurrency.set(w.moneda,(perCurrency.get(w.moneda)||0)+v.dbCents(w.saldo_actual));
 const saldos=[];let total=0;const sinConvertir=[];
 for(const [cur,cents] of [...perCurrency].sort((x,y)=>x[0].localeCompare(y[0]))){
  const q=fx.quote(snap,cur,base);const converted=q?fx.convertCents(cents,q.racional):null;
  saldos.push({moneda:cur,saldo:v.money(cents),convertido:converted===null?null:v.money(converted),tasa:cur===base?'1':(q?.tasa??null)});
  if(converted===null){if(cents)sinConvertir.push({moneda:cur,saldo:v.money(cents)});}else total+=converted;
 }
 const ingresos=await mc.valuate(flows.filter(f=>f.tipo==='INGRESO').map(f=>({moneda:f.moneda,dia:f.dia,cents:v.dbCents(f.total)})),base);
 const gastos=await mc.valuate(flows.filter(f=>f.tipo==='GASTO').map(f=>({moneda:f.moneda,dia:f.dia,cents:v.dbCents(f.total)})),base);
 const flujos=[...new Set(flows.map(f=>f.moneda))].sort().map(cur=>{const sum=t=>flows.filter(f=>f.moneda===cur&&f.tipo===t).reduce((a,f)=>a+v.dbCents(f.total),0);return {moneda:cur,ingresos:v.money(sum('INGRESO')),gastos:v.money(sum('GASTO'))};});
 const tasas=fx.status(snap,v.today());
 const alerts=[];
 if(perCurrency.size>1||[...perCurrency.keys()].some(c=>c!==base)){
  if(tasas.estado==='desactualizada')alerts.push({tipo:'aviso',mensaje:`Las tasas de referencia tienen ${tasas.antiguedad_dias} días (cotización del ${tasas.fecha_cotizacion}). El total es aproximado.`});
  if(sinConvertir.length)alerts.push({tipo:'aviso',mensaje:`Sin tasa de referencia para ${sinConvertir.map(x=>x.moneda).join(', ')}: esos saldos se muestran aparte y no entran en el total.`});
 }
 for(const b of budgets)if(b.porcentaje>=80)alerts.push({tipo:b.porcentaje>=100?'peligro':'aviso',mensaje:`${b.categoria}: ${b.porcentaje}% del presupuesto utilizado.`});
 for(const r of recurring)if(r.vencido)alerts.push({tipo:'aviso',mensaje:`Confirma el recordatorio ${r.nombre} (${r.proxima_fecha}).`});
 for(const d of debts)if(d.estado==='PENDIENTE'&&d.fecha_vencimiento&&d.fecha_vencimiento<=v.today())alerts.push({tipo:'aviso',mensaje:`Deuda vencida: ${d.nombre}.`});
 const ingresoSinTasa=ingresos.sin_tasa.length>0,gastoSinTasa=gastos.sin_tasa.length>0;
 return {moneda:base,mes:m,saldo_total:v.money(total),saldo_total_completo:sinConvertir.length===0,saldos_por_moneda:saldos,saldos_sin_convertir:sinConvertir,
  ingresos:v.money(ingresos.cents),gastos:v.money(gastos.cents),neto:v.money(ingresos.cents-gastos.cents),flujos_completos:!ingresoSinTasa&&!gastoSinTasa,
  flujos_por_moneda:flujos,flujos_sin_tasa:{ingresos:ingresos.sin_tasa,gastos:gastos.sin_tasa},tasas,
  carteras:wallets,presupuestos:budgets,recurrentes:recurring,deudas:debts,metas:goals,grupos:groups,alertas:alerts};
}
module.exports={quickExpenses,listWallets,listCategories,createWallet,listBudgets,createBudget,updateBudget,deleteBudget,listRecurring,saveRecurring,disableRecurring,confirmRecurring,listDebts,createDebt,addPayment,listPayments,deleteDebt,listGoals,createGoal,addContribution,listContributions,deleteGoal,listGroups,createGroup,addMember,groupDetail,groupExpense,settleGroup,panel,movement};
