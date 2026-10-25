// Métricas de carga en el navegador (local, no producción), con red y CPU limitadas por CDP.
// Uso: AF_PW=<contraseña ficticia> node vitals.cjs <baseURL> <salida.json>
const {chromium}=require('playwright');const fs=require('fs');const [base,out]=process.argv.slice(2);
const perfiles=[{nombre:'escritorio sin limitar',viewport:{width:1366,height:850},red:null,cpu:1},
 {nombre:'móvil 4G lento + CPU ×4',viewport:{width:390,height:844},isMobile:true,red:{latency:150,downloadThroughput:1.6e6/8,uploadThroughput:750e3/8},cpu:4}];
const observe=()=>{window.__v={lcp:0,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__v.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__v.cls+=e.value;}).observe({type:'layout-shift',buffered:true});};
const read=p=>p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];const r=performance.getEntriesByType('resource');
 return {ttfb_ms:+(n?.responseStart||0).toFixed(0),dom_listo_ms:+(n?.domContentLoadedEventEnd||0).toFixed(0),lcp_ms:+window.__v.lcp.toFixed(0),cls:+window.__v.cls.toFixed(3),
  recursos:r.length,kb_transferidos:+((r.reduce((s,x)=>s+(x.transferSize||0),0)+(n?.transferSize||0))/1024).toFixed(0)};});
(async()=>{const b=await chromium.launch();const res=[];
 for(const pf of perfiles){const ctx=await b.newContext({viewport:pf.viewport,isMobile:pf.isMobile});await ctx.addInitScript(observe);const p=await ctx.newPage();
  const cdp=await ctx.newCDPSession(p);if(pf.red)await cdp.send('Network.emulateNetworkConditions',{offline:false,...pf.red});await cdp.send('Emulation.setCPUThrottlingRate',{rate:pf.cpu});
  await p.goto(base+'/login',{waitUntil:'networkidle'});await p.waitForTimeout(500);res.push({perfil:pf.nombre,vista:'login (carga en frío)',...await read(p)});
  await p.fill('#login-email','amigo@local.test');await p.fill('#login-password',process.env.AF_PW);const t=Date.now();await p.click('button[type=submit]');
  await p.waitForURL(/panel/);await p.waitForLoadState('networkidle');res.push({perfil:pf.nombre,vista:'panel tras login (navegación SPA)',ms_hasta_red_inactiva:Date.now()-t});
  await p.goto(base+'/panel',{waitUntil:'networkidle'});await p.waitForTimeout(500);res.push({perfil:pf.nombre,vista:'panel (recarga completa)',...await read(p)});
  await ctx.close();}
 await b.close();fs.writeFileSync(out,JSON.stringify({fecha:new Date().toISOString(),base,resultados:res},null,1));console.log(JSON.stringify(res,null,1));})();
