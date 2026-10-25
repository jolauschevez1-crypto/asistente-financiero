'use strict';
const v = require('./validation');
function parseExpenses(text) {
 if(typeof text!=='string'||!text.trim()||text.length>4000)v.fail('Escribe entre 1 y 4000 caracteres.');
 const parts=text.trim().split(/[,;\n]+|\s+y\s+(?=\S)/i).map(s=>s.trim()).filter(Boolean);
 if(!parts.length||parts.length>30)v.fail('Puedes registrar entre 1 y 30 gastos por carga.');
 return parts.map((part,i)=>{
  const match=part.match(/^(.+?)\s+(\d{1,9}(?:\.\d{1,2})?)(k)?$/i);
  if(!match)v.fail(`Gasto ${i+1}: usa concepto e importe, por ejemplo café 2.50. Separa los gastos con coma; usa punto para decimales.`);
  const descripcion=v.text(match[1],'Concepto',200,true);
  const cents=v.cents(match[2])*(match[3]?1000:1);
  const monto=v.money(cents);v.cents(monto);
  return {descripcion,monto};
 });
}
module.exports={parseExpenses};
