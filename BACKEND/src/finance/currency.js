'use strict';
const db = require('../config/db');
const monedas = Object.freeze([
  {codigo:'USD',nombre:'Dólar estadounidense'}, {codigo:'COP',nombre:'Peso colombiano'},
  {codigo:'MXN',nombre:'Peso mexicano'}, {codigo:'EUR',nombre:'Euro'},
  {codigo:'PEN',nombre:'Sol peruano'}, {codigo:'ARS',nombre:'Peso argentino'},
  {codigo:'CLP',nombre:'Peso chileno'},
]);
function validate(value = 'USD') {
  if(typeof value!=='string' || !monedas.some(m=>m.codigo===value)) {
    const error=new Error('Selecciona una moneda válida.');error.status=400;error.code='MONEDA_INVALIDA';throw error;
  }
  return value;
}
function preference(user) {
  return {moneda:user.moneda,puede_cambiar:!user.moneda_fijada,
    motivo:user.moneda_fijada?'La moneda se conserva porque ya hay actividad financiera o pertenencia a un grupo. No se convierten importes.':null,monedas};
}
async function getPreferences(uid,client=db) {
  const user=(await client.query('SELECT moneda,moneda_fijada FROM usuarios WHERE id=$1 AND deleted_at IS NULL',[uid])).rows[0];
  if(!user){const e=new Error('Usuario no disponible.');e.status=404;throw e;}
  return preference(user);
}
async function updatePreferences(uid,body) {
  const moneda=validate(body?.moneda);
  if(!body || body.moneda===undefined){const e=new Error('Selecciona una moneda.');e.status=400;throw e;}
  return db.withTransaction(async c=>{
    const user=(await c.query('SELECT moneda,moneda_fijada FROM usuarios WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[uid])).rows[0];
    if(!user){const e=new Error('Usuario no disponible.');e.status=404;throw e;}
    if(user.moneda!==moneda && user.moneda_fijada){const e=new Error(preference(user).motivo);e.status=409;e.code='MONEDA_BLOQUEADA';throw e;}
    await c.query('UPDATE usuarios SET moneda=$1 WHERE id=$2',[moneda,uid]);
    return preference({...user,moneda});
  });
}
// Scope every amount-bearing source before aggregation, preserving existing SQL parameters.
// Only internal, static query strings are passed here; currency is always a bound parameter.
async function query(client,sql,params=[],moneda='USD') {
  validate(moneda);
  const scoped=sql.replace(/\b(FROM|JOIN)\s+(usuarios|cuentas|movimientos)\b/gi,(_,op,table)=>`${op} moneda_${table.toLowerCase()}`);
  return client.query(`WITH moneda_usuarios AS (SELECT * FROM usuarios WHERE moneda=$${params.length+1}),
    moneda_cuentas AS (SELECT c.* FROM cuentas c JOIN moneda_usuarios u ON u.id=c.usuario_id),
    moneda_movimientos AS (SELECT m.* FROM movimientos m JOIN moneda_usuarios u ON u.id=m.usuario_id)
    ${scoped}`,[...params,moneda]);
}
module.exports={monedas,validate,getPreferences,updatePreferences,query};
