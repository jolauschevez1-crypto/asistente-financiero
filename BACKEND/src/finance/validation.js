'use strict';
function fail(message, status=400, code='VALIDACION') { const e=new Error(message); e.status=status; e.code=code; e.expose=true; throw e; }
// Nombres (carteras, metas, grupos, contrapartes): letras, números, espacios y puntuación
// básica; sin emojis ni símbolos de marcado. `free` es para descripciones de texto libre.
const NAME_RE=/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,:;'’()#&\/+-]*$/u;
function text(value, label='Nombre', max=100, free=false) {
 if(typeof value!=='string') fail(`${label} es obligatorio.`);
 const v=value.trim(); if(!v || v.length>max || /[\x00-\x1f\x7f]/.test(v)) fail(`${label}: entre 1 y ${max} caracteres válidos.`);
 if(!free&&!NAME_RE.test(v)) fail(`${label}: usa letras, números, espacios y signos básicos (. , - ' ( ) # & /).`);
 return v;
}
function id(value) { if(!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) fail('Identificador no válido.'); return Number(value); }
function cents(value, zero=false) {
 if(!['string','number'].includes(typeof value) || !/^\d{1,9}(\.\d{1,2})?$/.test(String(value))) fail('El importe debe tener hasta 2 decimales y ser menor que 1.000.000.000.');
 const [a,b='']=String(value).split('.'); const n=Number(a)*100+Number(b.padEnd(2,'0')); if(n<(zero?0:1)) fail('El importe debe ser positivo.'); return n;
}
function money(n) { if(!Number.isSafeInteger(n)) fail('Importe fuera de rango.'); return `${n<0?'-':''}${Math.floor(Math.abs(n)/100)}.${String(Math.abs(n)%100).padStart(2,'0')}`; }
function dbCents(value) { const n=Number(value); const c=Math.round(n*100); if(!Number.isFinite(n)||!Number.isSafeInteger(c)) fail('Saldo fuera de rango.',409); return c; }
function date(value, optional=false) {
 if(optional&&(value==null||value==='')) return null;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>'9999-12-31') fail('Fecha no válida (YYYY-MM-DD).');
 const d=new Date(`${value}T12:00:00Z`); if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value) fail('Fecha de calendario no válida.'); return value;
}
function month(value) { if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)||value<'1900-01'||value>'9998-12') fail('Mes no válido (YYYY-MM).'); return value; }
function today() { const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guayaquil',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); const g=t=>p.find(x=>x.type===t).value;return `${g('year')}-${g('month')}-${g('day')}`; }
function choice(value, values, label) { if(!values.includes(value)) fail(`${label} no válido.`);return value; }
function key(value) { const k=text(value,'Clave de operación',80);if(!/^[A-Za-z0-9_-]{8,80}$/.test(k))fail('Clave de operación no válida.');return k; }
function nextDate(current,frequency,day,anchorMonth) {
 date(current);const [y,m]=current.split('-').map(Number);let d;
 if(frequency==='SEMANAL'){d=new Date(`${current}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+7);}
 else { const year=frequency==='ANUAL'?y+1:y+Math.floor(m/12); const monthIndex=frequency==='ANUAL'?anchorMonth-1:m%12;const last=new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();d=new Date(Date.UTC(year,monthIndex,Math.min(day,last),12)); }
 return date(d.toISOString().slice(0,10));
}
module.exports={fail,text,id,cents,money,dbCents,date,month,today,choice,key,nextDate};
