// Read-only acceptance checks against an already running local installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = 'http://127.0.0.1:3001';
const results = [];
async function check(id, name, action) {
    try { const evidence=await action(); results.push({id,name,status:'PASS',evidence}); console.log(`${id} PASS ${name}`); }
    catch(error) { results.push({id,name,status:'FAIL',message:error.message}); console.error(`${id} FAIL ${name}: ${error.message}`); }
}
(async()=>{
    let token;
    await check('LOC-01','Servidor local identificado',async()=>{
        const r=await fetch(base+'/api/health');const data=await r.json();assert.equal(r.status,200);assert.equal(data.service,'asistente-financiero-local');return {status:r.status,service:data.service,version:data.version};
    });
    await check('LOC-02','Interfaz compilada con estilos compatibles con CSP',async()=>{
        const r=await fetch(base+'/panel');const html=await r.text();assert.equal(r.status,200);assert.match(html,/<app-root/);
        assert.doesNotMatch(html, /onload=|https:\/\/(?:fonts\.google|accounts\.google)/);
        const css=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
        assert.ok(css.length>0);for(const url of css){const style=await fetch(new URL(url,base));assert.equal(style.status,200);assert.match(style.headers.get('content-type'),/css/);assert.match(await style.text(),/af-high-contrast/);}
        assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);
        return {status:r.status,stylesheets:css,inlineHandlers:false};
    });
    await check('LOC-03','Inicio de sesión de prueba',async()=>{
        const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({correo:process.env.TEST_EMAIL||'demo@local.test',password:process.env.TEST_PASSWORD||'DemoLocal2026!'})});const b=await r.json();assert.equal(r.status,200);assert.ok(b.token);token=b.token;return {status:r.status,role:b.usuario.rol};
    });
    const get=async url=>{const r=await fetch(base+'/api/'+url,{headers:{Authorization:`Bearer ${token}`}});const b=await r.json();assert.equal(r.status,200,url);return b.data;};
    await check('LOC-04','Panel consistente con las carteras persistidas',async()=>{
        const p=await get('finanzas/panel'),w=await get('finanzas/carteras');const total=w.reduce((sum,x)=>sum+Math.round(Number(x.saldo_actual)*100),0);assert.equal(Math.round(Number(p.saldo_total)*100),total);assert.equal(Math.round(Number(p.neto)*100),Math.round(Number(p.ingresos)*100)-Math.round(Number(p.gastos)*100));return {saldo_total:p.saldo_total,ingresos:p.ingresos,gastos:p.gastos,neto:p.neto,carteras:w.length};
    });
    await check('LOC-05','Todos los módulos responden con datos',async()=>{const counts={};for(const route of ['presupuestos','recurrentes','deudas','metas','grupos']){const data=await get('finanzas/'+route);assert.ok(Array.isArray(data),route);counts[route]=data.length;}return counts;});
    await check('LOC-06','IA desactivada y finanzas independientes',async()=>{const data=await get('ia/estado');assert.equal(data.enabled,false);assert.equal(data.provider,'disabled');return {enabled:data.enabled,provider:data.provider};});
    await check('LOC-07','Datos protegidos y rutas API diferenciadas',async()=>{const privateResponse=await fetch(base+'/api/finanzas/carteras');assert.equal(privateResponse.status,401);const unknown=await fetch(base+'/api/no-existe');assert.equal(unknown.status,404);assert.match(unknown.headers.get('content-type'),/json/);return {sinSesion:401,rutaDesconocida:404};});
    await check('LOC-08','Respaldo completo exportado solo por administrador',async()=>{
        const denied=await fetch(base+'/api/configuracion/respaldo',{headers:{Authorization:`Bearer ${token}`}});assert.equal(denied.status,403);
        const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({correo:process.env.TEST_ADMIN_EMAIL||'admin@local.test',password:process.env.TEST_ADMIN_PASSWORD||'AdminLocal2026!'})});const admin=await login.json();assert.equal(login.status,200);
        const r=await fetch(base+'/api/configuracion/respaldo',{headers:{Authorization:`Bearer ${admin.token}`}});assert.equal(r.status,200);const backup=await r.json();assert.equal(backup.version,2);
        for(const table of ['usuarios','movimientos','fin_metas','fin_deudas','fin_grupos','fin_miembros','fin_recurrentes','auditoria'])assert.ok(Array.isArray(backup.tablas[table]),table);
        return {version:backup.version,tablas:Object.keys(backup.tablas).length,checksumPresente:/^[a-f0-9]{64}$/.test(backup.sha256),sinPermiso:denied.status};
    });
    const report={generatedAt:new Date().toISOString(),scope:'Verificación HTTP local, solo lectura',results,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length};
    const output=path.resolve(__dirname,'../../EVIDENCIAS_LOCALES/http-local.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
