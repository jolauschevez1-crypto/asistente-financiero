const jwt=require('jsonwebtoken');
const db=require('../config/db');
exports.verificarToken=async(req,res,next)=>{
 const token=/^Bearer (\S+)$/i.exec(req.headers.authorization||'')?.[1];
 if(!token)return res.status(401).json({message:'Inicia sesión para continuar.'});
 let payload;
 try{payload=jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']});}
 catch{return res.status(401).json({message:'Tu sesión expiró. Inicia sesión nuevamente.',code:'SESSION_EXPIRED'});}
 if (!payload.iat || Date.now()/1000 >= payload.iat + 1800) return res.status(401).json({message:'Tu sesión expiró. Inicia sesión nuevamente.',code:'SESSION_EXPIRED'});
 try{
  const u=(await db.query('SELECT id,correo,rol,moneda,token_version FROM usuarios WHERE id=$1 AND deleted_at IS NULL',[payload.id])).rows[0];
  if(!u||Number(payload.version??-1)!==u.token_version)return res.status(401).json({message:'Tu sesión ya no es válida. Inicia sesión nuevamente.',code:'SESSION_EXPIRED'});
  req.usuario={...payload,...u};next();
 }catch(error){next(error);}
};
exports.verificarAdmin=(req,res,next)=>{if(!['ADMIN','ADMINISTRADOR'].includes(req.usuario?.rol))return res.status(403).json({message:'Se requieren permisos de administrador.'});next();};
