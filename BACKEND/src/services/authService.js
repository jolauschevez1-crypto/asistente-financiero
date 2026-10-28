const nodemailer = require('nodemailer');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { bad } = require('../utils/validation');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
class AuthService {
 async enviarCorreo(destinatario,mensaje) {
  if(process.env.SMTP_ENABLED !== 'true') throw bad('La recuperación por correo no está disponible en esta instalación. Pide al administrador que restablezca tu contraseña.',503);
  const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
  return transporter.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:destinatario,subject:'Recuperación de Asistente Financiero',text:mensaje});
 }
 async solicitarRecuperacion(correo) {
  if(process.env.SMTP_ENABLED !== 'true') throw bad('La recuperación por correo no está disponible en esta instalación. Pide al administrador que restablezca tu contraseña desde Usuarios.',503);
  const code=crypto.randomInt(100000,1000000).toString(),hash=await bcrypt.hash(code,10);
  await db.query('UPDATE usuarios SET codigo_recuperacion=$1,codigo_expiracion=NOW()+INTERVAL \'15 minutes\',codigo_verificacion=false,reset_token_hash=NULL,reset_token_expires=NULL WHERE lower(correo)=lower($2) AND deleted_at IS NULL',[hash,correo]);
  await this.enviarCorreo(correo,`Tu código es ${code}. Expira en 15 minutos.`);
  return {message:'Código enviado a tu correo.'};
 }
 async verificarCodigo(correo,codigoIngresado) {
  return db.withTransaction(async client=>{
   const u=(await client.query('SELECT * FROM usuarios WHERE lower(correo)=lower($1) AND deleted_at IS NULL FOR UPDATE',[correo])).rows[0];
   if(!u?.codigo_recuperacion || !u.codigo_expiracion || new Date(u.codigo_expiracion)<=new Date() || !await bcrypt.compare(codigoIngresado,u.codigo_recuperacion)) throw bad('Código inválido o expirado.',400);
   const resetToken=crypto.randomBytes(32).toString('hex');
   await client.query('UPDATE usuarios SET codigo_recuperacion=NULL,codigo_expiracion=NULL,codigo_verificacion=false,reset_token_hash=$1,reset_token_expires=NOW()+INTERVAL \'15 minutes\' WHERE id=$2',[digest(resetToken),u.id]);
   return {message:'Código verificado. Cambia tu contraseña dentro de 15 minutos.',resetToken};
  });
 }
 async cambiarContrasena(correo,hashNuevaPassword,resetToken) {
  if(typeof resetToken!=='string'||!/^[a-f0-9]{64}$/.test(resetToken)) throw bad('Autorización de recuperación inválida o expirada.',403);
  const result=await db.query('UPDATE usuarios SET password=$1,reset_token_hash=NULL,reset_token_expires=NULL,codigo_recuperacion=NULL,codigo_expiracion=NULL,codigo_verificacion=false,token_version=token_version+1 WHERE lower(correo)=lower($2) AND reset_token_hash=$3 AND reset_token_expires>NOW() AND deleted_at IS NULL RETURNING id',[hashNuevaPassword,correo,digest(resetToken)]);
  if(!result.rows.length) throw bad('Autorización de recuperación inválida, expirada o ya utilizada.',403);
  return {message:'Contraseña actualizada correctamente.'};
 }
}
module.exports=new AuthService();
