const {chromium}=require('playwright');
// Barrido de rutas: errores de consola, solicitudes fallidas (>=400) y desborde horizontal.
const R=['/panel','/carteras','/presupuestos','/recurrentes','/deudas','/metas','/grupos','/estadisticas','/ia','/configuracion','/perfil','/admin'];
(async()=>{const b=await chromium.launch();
for(const vp of [{width:1366,height:850},{width:390,height:844}]){
const ctx=await b.newContext({viewport:vp,locale:'es-EC'});const p=await ctx.newPage();
const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160))});p.on('pageerror',e=>errs.push('pageerror '+e.message.slice(0,160)));
p.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url().replace('http://127.0.0.1:3102',''))});
await p.goto('http://127.0.0.1:3102/login',{waitUntil:'networkidle'});await p.fill('#login-email','amigo@local.test');await p.fill('#login-password',process.env.AF_PW);await p.click('button[type=submit]');await p.waitForURL(/panel/);await p.waitForLoadState('networkidle');
for(const r of R){errs.length=0;await p.goto('http://127.0.0.1:3102'+r,{waitUntil:'networkidle'});await p.waitForTimeout(300);
const o=await p.evaluate(()=>({url:location.pathname,sw:document.documentElement.scrollWidth,w:document.documentElement.clientWidth,h1:(document.querySelector('h1')||{}).textContent,spin:document.querySelectorAll('[aria-busy=true],.spinner,.loading').length}));
console.log(vp.width,r,JSON.stringify(o),errs.length?JSON.stringify(errs):'');}
await ctx.close();}
await b.close();})();
