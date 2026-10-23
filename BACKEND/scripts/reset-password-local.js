const readline=require('node:readline/promises');
const bcrypt=require('bcryptjs');
const db=require('../src/config/db');
const {password}=require('../src/utils/validation');
(async()=>{
 const correo=process.argv[2];
 if(!correo) throw new Error('Uso: npm run password:local -- correo@local.test');
 const u=(await db.query('SELECT id,nombre,correo,username FROM usuarios WHERE lower(correo)=lower($1) AND deleted_at IS NULL',[correo])).rows[0];
 if(!u) throw new Error('Usuario no encontrado.');
 const rl=readline.createInterface({input:process.stdin,output:process.stdout});
 let value;
 try{value=await rl.question('Nueva contraseña (visible solo en esta terminal local): ');}finally{rl.close();}
 password(value,u);
 const hash=await bcrypt.hash(value,10);
 await db.query('UPDATE usuarios SET password=$1,token_version=token_version+1,reset_token_hash=NULL,reset_token_expires=NULL,codigo_recuperacion=NULL,codigo_verificacion=false WHERE id=$2',[hash,u.id]);
 console.log('Contraseña actualizada. Las sesiones anteriores se revocaron.');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.pool.end());
