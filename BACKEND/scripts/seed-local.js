const bcrypt=require('bcryptjs');
const db=require('../src/config/db');
const {initialize}=require('./init-local');
const users=[{nombre:'Usuario de prueba',correo:'demo@local.test',rol:'USUARIO',password:'DemoLocal2026!'},{nombre:'Administrador local',correo:'admin@local.test',rol:'ADMIN',password:'AdminLocal2026!'},{nombre:'Compañero de prueba',correo:'amigo@local.test',rol:'USUARIO',password:'AmigoLocal2026!'}];
async function seed(){
 await initialize();
 for(const u of users){
  const existing=await db.query('SELECT id FROM usuarios WHERE lower(correo)=lower($1)',[u.correo]);
  if(existing.rows.length) continue;
  const hash=await bcrypt.hash(u.password,10);
  await db.withTransaction(async client=>{
   const id=(await client.query('INSERT INTO usuarios(nombre,correo,password,rol,fecha_nacimiento) VALUES($1,$2,$3,$4,$5) RETURNING id',[u.nombre,u.correo,hash,u.rol,'2000-01-01'])).rows[0].id;
   await client.query('INSERT INTO cuentas(nombre,usuario_id) VALUES($1,$2)',['Efectivo',id]);
  });
 }
 console.log('Cuentas ficticias disponibles: demo@local.test, admin@local.test, amigo@local.test. La siembra no cambia contraseñas existentes.');
}
if(require.main===module)seed().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.pool.end());
module.exports={seed};
