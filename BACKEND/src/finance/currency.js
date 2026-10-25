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
// v3: la moneda del usuario es solo la de presentación del panel y puede cambiarse en cualquier
// momento. No convierte ni reetiqueta importes: cada cartera conserva su propia moneda.
function preference(user) {
  return {moneda:user.moneda,puede_cambiar:true,motivo:null,monedas,monedas_con_tasa:require('./fx').CON_TASA};
}
async function getPreferences(uid,client=db) {
  const user=(await client.query('SELECT moneda FROM usuarios WHERE id=$1 AND deleted_at IS NULL',[uid])).rows[0];
  if(!user){const e=new Error('Usuario no disponible.');e.status=404;throw e;}
  return preference(user);
}
async function updatePreferences(uid,body) {
  if(!body || body.moneda===undefined){const e=new Error('Selecciona una moneda.');e.status=400;e.code='MONEDA_INVALIDA';throw e;}
  const moneda=validate(body.moneda);
  const user=(await db.query('UPDATE usuarios SET moneda=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING moneda',[moneda,uid])).rows[0];
  if(!user){const e=new Error('Usuario no disponible.');e.status=404;throw e;}
  return preference(user);
}
// Scope every amount-bearing source before aggregation, preserving existing SQL parameters.
// Only internal, static query strings are passed here; currency is always a bound parameter.
async function query(client,sql,params=[],moneda='USD') {
  validate(moneda);
  const scoped=sql.replace(/\b(FROM|JOIN)\s+(usuarios|cuentas|movimientos)\b/gi,(_,op,table)=>`${op} moneda_${table.toLowerCase()}`);
  // Importes por moneda de cartera y de movimiento; las personas no se filtran por divisa.
  return client.query(`WITH moneda_usuarios AS (SELECT * FROM usuarios WHERE $${params.length+1}::text IS NOT NULL),
    moneda_cuentas AS (SELECT c.* FROM cuentas c WHERE c.moneda=$${params.length+1}),
    moneda_movimientos AS (SELECT m.* FROM movimientos m WHERE m.moneda=$${params.length+1})
    ${scoped}`,[...params,moneda]);
}
module.exports={monedas,validate,getPreferences,updatePreferences,query};
