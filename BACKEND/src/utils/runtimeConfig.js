'use strict';
function runtimeConfig(env=process.env) {
 const cloud=env.VERCEL==='1'||env.APP_MODE==='cloud';
 const origins=new Set();
 for(const raw of [env.APP_ORIGIN,...(env.CORS_ORIGINS||'').split(','),...[env.VERCEL_URL,env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host=>`https://${host}`)]) {
  if(!raw)continue;
  try {const url=new URL(raw.trim());if(url.protocol==='https:'||(!cloud&&url.protocol==='http:'))origins.add(url.origin);}catch{}
 }
 return {cloud, origins, allowsOrigin(origin){return !origin||origins.has(origin)||(!cloud&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));}};
}
function validateCloudEnvironment(env=process.env) {
 if(!runtimeConfig(env).cloud)return;
 if(env.DB_ENGINE!=='postgres'||!env.DATABASE_URL)throw new Error('El despliegue requiere DB_ENGINE=postgres y DATABASE_URL persistente.');
 for(const key of ['JWT_SECRET','REFRESH_JWT_SECRET'])if(!env[key]||env[key].length<48)throw new Error(`${key} debe contener un secreto nuevo de al menos 48 caracteres.`);
 if(env.JWT_SECRET===env.REFRESH_JWT_SECRET)throw new Error('Los secretos de sesión deben ser diferentes.');
}
module.exports={runtimeConfig,validateCloudEnvironment};
