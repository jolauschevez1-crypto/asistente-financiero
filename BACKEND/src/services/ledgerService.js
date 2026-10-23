const db = require('../config/db');
const { money, text, bad } = require('../utils/validation');

const cents = value => { const [a,b=''] = String(value).split('.'); return BigInt(a)*100n+BigInt(b.padEnd(2,'0')); };
const decimal = value => `${value < 0n ? '-' : ''}${(value < 0n ? -value : value)/100n}.${String((value < 0n ? -value : value)%100n).padStart(2,'0')}`;
function effects(row, factor=1n) {
 const m=cents(row.monto)*factor;
 if(row.tipo==='INGRESO') return [[row.cuenta_origen_id || row.cuenta_destino_id,m]];
 if(row.tipo==='GASTO') return [[row.cuenta_origen_id,-m]];
 return [[row.cuenta_origen_id,-m],[row.cuenta_destino_id,m]];
}
async function applyEffects(client, usuarioId, entries) {
 const changes = new Map();
 for(const [id,amount] of entries) { if(!id) throw bad('Cuenta requerida.'); changes.set(id,(changes.get(id)||0n)+amount); }
 for(const [id,amount] of [...changes].sort((a,b)=>a[0]-b[0])) {
  const account=(await client.query('SELECT * FROM cuentas WHERE id=$1 AND usuario_id=$2 AND deleted_at IS NULL FOR UPDATE',[id,usuarioId])).rows[0];
  if(!account) throw bad('La cartera no existe o no pertenece al usuario.',404);
  if(cents(account.saldo_actual)+amount<0n) throw bad(`Saldo insuficiente en ${account.nombre}. La operación no se registró.`,409);
  await client.query('UPDATE cuentas SET saldo_actual=saldo_actual+$1 WHERE id=$2',[decimal(amount),id]);
 }
}
async function account(client, userId, name) {
 name=text(name,'Cartera',100);
 let found=(await client.query('SELECT * FROM cuentas WHERE usuario_id=$1 AND lower(nombre)=lower($2) AND deleted_at IS NULL',[userId,name])).rows[0];
 if(!found) found=(await client.query('INSERT INTO cuentas(usuario_id,nombre) VALUES($1,$2) RETURNING *',[userId,name])).rows[0];
 return found;
}
async function prepare(client,userId,data,tipo) {
 if(!['INGRESO','GASTO','TRANSFERENCIA'].includes(tipo)) throw bad('Tipo de movimiento inválido.');
 if(tipo==='TRANSFERENCIA' && (!data.cuenta_origen || !data.cuenta_destino)) throw bad('La transferencia requiere cartera origen y destino.');
 const monto=money(data.monto), categoria=text(data.categoria||'Otros','Categoría',100);
 const origin=await account(client,userId,data.cuenta_origen || (tipo==='INGRESO' ? data.cuenta_destino : null) || 'Efectivo');
 const destination=tipo==='TRANSFERENCIA'?await account(client,userId,data.cuenta_destino):null;
 if(destination?.id===origin.id) throw bad('La cartera origen y destino deben ser diferentes.');
 let cat=(await client.query('SELECT id FROM categorias WHERE lower(nombre)=lower($1) AND (usuario_id=$2 OR usuario_id IS NULL) ORDER BY usuario_id NULLS FIRST LIMIT 1',[categoria,userId])).rows[0];
 if(!cat) cat=(await client.query('INSERT INTO categorias(nombre,usuario_id) VALUES($1,$2) RETURNING id',[categoria,userId])).rows[0];
 const type=(await client.query('SELECT id FROM tipos_movimiento WHERE nombre=$1',[tipo])).rows[0];
 return {tipo,monto,categoria_id:cat.id,tipo_movimiento_id:type.id,cuenta_origen_id:origin.id,cuenta_destino_id:destination?.id||null,
  descripcion:text(data.descripcion||'Movimiento financiero','Descripción',255,false), metodo_pago:text(data.metodo_pago||'EFECTIVO','Método de pago',50),categoria,cuenta_origen:origin.nombre,cuenta_destino:destination?.nombre||null};
}
async function lockUser(client,userId) {
 if(!Number.isSafeInteger(Number(userId)) || Number(userId)<=0) throw bad('Usuario autenticado requerido.',401);
 const u=await client.query('SELECT id FROM usuarios WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[userId]);
 if(!u.rows.length) throw bad('Usuario no disponible.',404);
}
async function original(client,userId,id) {
 const m=(await client.query('SELECT m.*,t.nombre AS tipo FROM movimientos m JOIN tipos_movimiento t ON t.id=m.tipo_movimiento_id WHERE m.id=$1 AND m.usuario_id=$2 AND m.deleted_at IS NULL FOR UPDATE',[id,userId])).rows[0];
 if(!m) throw bad('Movimiento no encontrado o ya eliminado.',404);
 const table=(await client.query("SELECT to_regclass('public.fin_movimiento_vinculos') AS name")).rows[0].name;
 if(table && (await client.query('SELECT 1 FROM fin_movimiento_vinculos WHERE movimiento_id=$1',[id])).rows.length) throw bad('Este movimiento está vinculado a un módulo financiero. Adminístralo desde el módulo de origen.',409);
 return m;
}
async function create(data) {
 return db.withTransaction(async client=>{
  await lockUser(client,data.usuario_id);
  const m=await prepare(client,data.usuario_id,data,String(data.tipo||'').toUpperCase());
  await applyEffects(client,data.usuario_id,effects(m));
  const result=(await client.query('INSERT INTO movimientos(usuario_id,tipo_movimiento_id,categoria_id,cuenta_origen_id,cuenta_destino_id,monto,descripcion,metodo_pago) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[data.usuario_id,m.tipo_movimiento_id,m.categoria_id,m.cuenta_origen_id,m.cuenta_destino_id,m.monto,m.descripcion,m.metodo_pago])).rows[0];
  return {...m,...result};
 });
}
async function edit(id,userId,data) {
 return db.withTransaction(async client=>{
  await lockUser(client,userId); const old=await original(client,userId,id);
  const m=await prepare(client,userId,data,old.tipo);
  await applyEffects(client,userId,[...effects(old,-1n),...effects(m)]);
  const result=(await client.query('UPDATE movimientos SET categoria_id=$1,cuenta_origen_id=$2,cuenta_destino_id=$3,monto=$4,descripcion=$5,metodo_pago=$6 WHERE id=$7 AND usuario_id=$8 RETURNING *',[m.categoria_id,m.cuenta_origen_id,m.cuenta_destino_id,m.monto,m.descripcion,m.metodo_pago,id,userId])).rows[0];
  return {...m,...result};
 });
}
async function remove(id,userId) {
 return db.withTransaction(async client=>{
  await lockUser(client,userId); const old=await original(client,userId,id);
  await applyEffects(client,userId,effects(old,-1n));
  await client.query('UPDATE movimientos SET deleted_at=NOW() WHERE id=$1 AND usuario_id=$2',[id,userId]);
  return {success:true,message:'Movimiento eliminado y saldos recalculados.'};
 });
}
module.exports={create,edit,remove};
