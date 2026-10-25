'use strict';
// Actualización programada de tasas (Vercel Cron, una vez al día). Vercel envía
// "Authorization: Bearer <CRON_SECRET>"; sin secreto configurado la ruta no actúa.
const router=require('express').Router();
const crypto=require('node:crypto');
const fx=require('../finance/fx');
function authorized(req){
 const secret=process.env.CRON_SECRET;if(!secret||secret.length<16)return false;
 const given=Buffer.from(String(req.get('authorization')||'')),expected=Buffer.from(`Bearer ${secret}`);
 return given.length===expected.length&&crypto.timingSafeEqual(given,expected);
}
router.get('/actualizar',async(req,res)=>{
 if(!authorized(req))return res.status(401).json({success:false,message:'No autorizado.'});
 try{res.json({success:true,data:await fx.refresh()});}
 catch(e){console.warn('[tasas] cron sin actualización:',e.code||e.name);res.status(502).json({success:false,message:'El proveedor de tasas no respondió; se conserva la última tasa válida.'});}
});
module.exports=router;
