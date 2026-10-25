const {chromium}=require('playwright');
// Uso: AF_PW=<contraseña ficticia> node desborde.cjs
// Busca elementos que se salen del ancho de 390 px aunque body tenga overflow-x:hidden (K-15 no los ve).
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'es-EC'});const p=await ctx.newPage();
await p.goto('http://127.0.0.1:3102/login',{waitUntil:'networkidle'});await p.fill('#login-email','amigo@local.test');await p.fill('#login-password',process.env.AF_PW);await p.click('button[type=submit]');await p.waitForURL(/panel/);await p.waitForLoadState('networkidle');
for(const r of ['/panel','/carteras','/presupuestos','/perfil']){await p.goto('http://127.0.0.1:3102'+r,{waitUntil:'networkidle'});
const o=await p.evaluate(()=>{const w=document.documentElement.clientWidth;const out=[];document.querySelectorAll('body *').forEach(e=>{const rc=e.getBoundingClientRect();if(rc.right>w+1&&rc.width>0)out.push((e.className&&e.className.baseVal===undefined?e.tagName+'.'+String(e.className).slice(0,40):e.tagName)+' '+Math.round(rc.right))});return {w,sw:document.documentElement.scrollWidth,out:out.slice(0,8)}});console.log(r,JSON.stringify(o));}
await b.close();})();
