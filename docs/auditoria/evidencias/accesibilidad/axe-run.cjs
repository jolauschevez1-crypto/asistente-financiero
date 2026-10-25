// Uso: AF_PW=<contraseña ficticia> node axe-run.cjs <baseURL> <salida.json>
const {chromium}=require('playwright');const fs=require('fs');
const axeSrc=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const [base,out]=process.argv.slice(2);
const tags=['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'];
const routes=['/panel','/carteras','/presupuestos','/recurrentes','/deudas','/metas','/grupos','/perfil','/ia'];
const views=[{name:'escritorio',viewport:{width:1366,height:850}},{name:'movil',viewport:{width:390,height:844},isMobile:true,hasTouch:true}];
(async()=>{const browser=await chromium.launch();const results=[];
 const scan=async(page,meta)=>{await page.waitForTimeout(500);await page.addScriptTag({content:axeSrc});
  const r=await page.evaluate(async t=>{const res=await axe.run(document,{runOnly:{type:'tag',values:t},resultTypes:['violations','incomplete']});
   const m=x=>({id:x.id,impact:x.impact,help:x.help,nodes:x.nodes.length,targets:x.nodes.slice(0,5).map(n=>n.target.join(' ')),resumen:x.nodes.slice(0,2).map(n=>(n.failureSummary||'').slice(0,300))});
   return {violations:res.violations.map(m),incomplete:res.incomplete.map(x=>({id:x.id,nodes:x.nodes.length,targets:x.nodes.slice(0,4).map(n=>n.target.join(' ')),html:x.nodes.slice(0,2).map(n=>n.html.slice(0,160)),msg:x.nodes.slice(0,1).map(n=>(n.failureSummary||'').slice(0,200))}))};},tags);
  results.push({...meta,...r});};
 for(const theme of (process.env.TEMAS||'oscuro,claro').split(','))for(const v of views){
  const ctx=await browser.newContext({bypassCSP:true,viewport:v.viewport,isMobile:v.isMobile,hasTouch:v.hasTouch,locale:'es-EC'});
  await ctx.addInitScript(t=>localStorage.setItem('asistente_financiero_tema',t),theme);
  const page=await ctx.newPage();const meta=r=>({ruta:r,tema:theme,vista:v.name});
  await page.goto(base+'/login',{waitUntil:'networkidle'});await scan(page,meta('/login'));
  await page.fill('#login-email','amigo@local.test');await page.fill('#login-password',process.env.AF_PW);
  await page.click('button[type=submit]');await page.waitForURL(/panel/,{timeout:15000});await page.waitForLoadState('networkidle');
  for(const r of routes){await page.goto(base+r,{waitUntil:'networkidle'});await scan(page,meta(r));}
  await page.goto(base+'/carteras',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/Nueva cartera/}).first().click();await scan(page,meta('/carteras#dialogo-crear'));await page.getByRole('button',{name:'Cancelar'}).click();
  await page.getByRole('button',{name:/Nuevo movimiento/}).click();await scan(page,meta('/carteras#dialogo-movimiento'));await page.getByRole('button',{name:'Cancelar'}).click();
  await page.getByRole('button',{name:'Transferir',exact:true}).first().click();await scan(page,meta('/carteras#dialogo-transferir'));await page.getByRole('button',{name:'Cancelar'}).click();
  await page.getByRole('button',{name:/Cambiar la moneda guardada/}).nth(2).click();await page.getByRole('button',{name:'Ver cotización'}).click();await page.waitForTimeout(600);await scan(page,meta('/carteras#dialogo-convertir'));await page.getByRole('button',{name:'Cancelar'}).click();
  if(v.name==='movil'){await page.locator('#menu-toggle').click();await scan(page,meta('menu-movil'));}
  else{await page.locator('#user-menu-button').click();await scan(page,meta('menu-usuario'));}
  await ctx.close();}
 await browser.close();
 const sum={};for(const r of results)for(const x of r.violations){sum[x.id]??={impact:x.impact,help:x.help,paginas:0,nodos:0};sum[x.id].paginas++;sum[x.id].nodos+=x.nodes;}
 fs.writeFileSync(out,JSON.stringify({herramienta:'axe-core 4.10.3',etiquetas:tags,base,fecha:new Date().toISOString(),resumen:sum,resultados:results},null,1));
 console.log(JSON.stringify(sum,null,1));console.log('escaneos',results.length);
})().catch(e=>{console.error(e);process.exit(1);});
