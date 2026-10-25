'use strict';
// Requisito del usuario (2026-10-25): contraseña fuerte sin el usuario dentro; texto solo texto,
// números solo números. Datos ficticios.
process.env.DB_ENGINE='pglite';
process.env.PGLITE_DATA_DIR='memory://';
process.env.NODE_ENV='test';
process.env.FX_PROVIDER='off';
process.env.JWT_SECRET='isolated-validation-test-only-secret-value';
process.env.REFRESH_JWT_SECRET='isolated-validation-test-only-refresh-secret';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const db=require('../src/config/db');
const {initialize}=require('../scripts/init-local');
const v=require('../src/utils/validation');
const finance=require('../src/finance/service');
let server,url;
async function post(route,body){const r=await fetch(url+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
before(async()=>{await initialize();server=require('../src/app').listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));url=`http://127.0.0.1:${server.address().port}/api`;});
after(async()=>{await new Promise(r=>server.close(r));await db.pool.end();});

test('política de contraseña: longitud, mayúscula, minúscula, número, especial, sin espacios',()=>{
 assert.deepEqual(v.passwordProblems('Clave#Fuerte26'),[]);
 const cases={'Corta#1a':/10 caracteres/,'clavefuerte#26':/mayúscula/,'CLAVEFUERTE#26':/minúscula/,'ClaveFuerte#xx':/número/,'ClaveFuerte2026':/especial/,'Clave Fuerte#26':/espacios/};
 for(const [p,re] of Object.entries(cases))assert.match(v.passwordProblems(p).join(' '),re,p);
 assert.match(v.passwordProblems('Á'.repeat(37)+'a1!').join(' '),/72 bytes/);
});

test('la contraseña no puede ser ni contener el nombre, el usuario del correo o el correo',()=>{
 const id={nombre:'Mariana López',correo:'mlopez@example.test'};
 for(const p of ['Mariana#2026x','MLOPEZ#2026xy','Clave#mlopez9','mlopez@example.test'])assert.match(v.passwordProblems(p,id).join(' '),/nombre, usuario o correo/,p);
 assert.deepEqual(v.passwordProblems('Ciruela#2026x',id),[]);
});

test('registro HTTP aplica la política y explica el motivo',async()=>{
 const base={nombre:'Mariana López',correo:'mariana@example.test'};
 const same=await post('/auth/registro',{...base,password:'Mariana2026!'});
 assert.equal(same.status,400);assert.match(JSON.stringify(same.data),/nombre, usuario o correo/);
 const weak=await post('/auth/registro',{...base,password:'clavesimple'});
 assert.equal(weak.status,400);assert.match(JSON.stringify(weak.data),/mayúscula/);
 assert.equal((await post('/auth/registro',{...base,password:'Ciruela#2026x'})).status,201);
 assert.equal((await post('/auth/registro',{nombre:'Mariana 2',correo:'m2@example.test',password:'Ciruela#2026x'})).status,400);
});

test('nombres solo texto e importes solo números en los módulos financieros',async()=>{
 const u=(await db.query("INSERT INTO usuarios(nombre,correo) VALUES('Validación','validacion@example.test') RETURNING id")).rows[0];
 for(const nombre of ['<script>','Ahorro 😀','=SUMA(A1)'])await assert.rejects(finance.createWallet(u.id,{nombre}),{status:400},nombre);
 assert.equal((await finance.createWallet(u.id,{nombre:'Cuenta 2 (Banco & Co.)'})).nombre,'Cuenta 2 (Banco & Co.)');
 for(const monto of ['12a','1e3','-5','12,50','0x10',' 7'])await assert.rejects(finance.createDebt(u.id,{nombre:'Préstamo',contraparte:'Persona',tipo:'PAGAR',monto}),{status:400},monto);
 await assert.rejects(finance.createDebt(u.id,{nombre:'Préstamo',contraparte:'<b>X</b>',tipo:'PAGAR',monto:'5'}),{status:400});
});
