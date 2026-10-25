// Uso: AF_PW=<contraseña ficticia> node keyboard.cjs <baseURL> <salida.json>
// Pruebas de teclado, foco visible y reflujo a 320 px (WCAG 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7, 2.4.11, 1.4.10).
const {chromium}=require('playwright');const fs=require('fs');
const [base,out]=process.argv.slice(2);const res=[];const rec=(id,desc,ok,detalle)=>res.push({id,desc,resultado:ok?'PASA':'FALLA',detalle});
const active=p=>p.evaluate(()=>{const e=document.activeElement;if(!e)return null;const s=getComputedStyle(e);const r=e.getBoundingClientRect();
 return {tag:e.tagName,id:e.id,cls:e.className&&String(e.className).slice(0,60),texto:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,40),
  foco:(parseFloat(s.outlineWidth)>0&&s.outlineStyle!=='none')||s.boxShadow!=='none',visible:r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight,enDialogo:!!e.closest('mat-dialog-container,[role=dialog],dialog')};});
(async()=>{const b=await chromium.launch();
 const login=async ctx=>{const p=await ctx.newPage();await p.goto(base+'/login',{waitUntil:'networkidle'});
  await p.keyboard.press('Tab');const f0=await active(p);rec('K-01','El primer Tab en login enfoca un control visible con foco visible',f0&&f0.visible&&f0.foco,JSON.stringify(f0));
  await p.focus('#login-email');await p.keyboard.type('amigo@local.test');await p.keyboard.press('Tab');
  let a=await active(p);rec('K-02','Tab pasa del correo a la contraseña',a&&a.id==='login-password',JSON.stringify(a));
  await p.keyboard.type(process.env.AF_PW);await p.keyboard.press('Enter');await p.waitForURL(/panel/,{timeout:15000});await p.waitForLoadState('networkidle');
  rec('K-03','Enter en el formulario inicia sesión solo con teclado',/panel/.test(p.url()),p.url());return p;};
 // Escritorio
 let ctx=await b.newContext({viewport:{width:1366,height:850}});let p=await login(ctx);
 await p.goto(base+'/carteras',{waitUntil:'networkidle'});await p.keyboard.press('Tab');let a=await active(p);
 rec('K-04','El primer Tab enfoca el enlace "Saltar al contenido" y es visible',a&&/Saltar/.test(a.texto)&&a.visible,JSON.stringify(a));
 await p.keyboard.press('Enter');await p.waitForTimeout(200);a=await active(p);rec('K-05','El enlace de salto lleva el foco al contenido principal',a&&a.id==='main-content',JSON.stringify(a));
 // Recorrido completo: todos los focos visibles y sin trampa
 await p.goto(base+'/carteras',{waitUntil:'networkidle'});const seen=[];let sinFoco=[];
 for(let i=0;i<80;i++){await p.keyboard.press('Tab');a=await active(p);if(!a||a.tag==='BODY')break;seen.push(a.tag+'#'+a.id+'.'+a.texto);if(!a.foco)sinFoco.push(a);}
 rec('K-06','Recorrido con Tab por Carteras: cada elemento enfocado muestra indicador de foco',sinFoco.length===0,`${seen.length} paradas; sin indicador: ${JSON.stringify(sinFoco.slice(0,5))}`);
 rec('K-07','Sin trampa de teclado: el recorrido avanza por elementos distintos',new Set(seen).size>=Math.min(seen.length,10),`${new Set(seen).size} elementos distintos`);
 // Menú de usuario
 await p.focus('#user-menu-button');await p.keyboard.press('Enter');await p.waitForTimeout(150);
 rec('K-08','Enter abre el menú de usuario',await p.locator('#user-menu').isVisible(),'');
 await p.keyboard.press('Escape');await p.waitForTimeout(150);a=await active(p);
 rec('K-09','Escape cierra el menú de usuario y devuelve el foco al botón',!(await p.locator('#user-menu').count())&&a.id==='user-menu-button',JSON.stringify(a));
 // Diálogo
 const btn=p.getByRole('button',{name:/Nueva cartera/}).first();await btn.focus();await p.keyboard.press('Enter');await p.waitForTimeout(400);a=await active(p);
 rec('K-10','Al abrir "Crear nueva cartera" el foco entra en el diálogo (botón «Nueva cartera» desde CR-04)',a&&a.enDialogo,JSON.stringify(a));
 let fuera=0;for(let i=0;i<25;i++){await p.keyboard.press('Tab');a=await active(p);if(!a.enDialogo)fuera++;}
 rec('K-11','Tab queda contenido dentro del diálogo modal',fuera===0,`${fuera} focos fuera en 25 Tabs`);
 await p.keyboard.press('Escape');await p.waitForTimeout(400);a=await active(p);
 rec('K-12','Escape cierra el diálogo y devuelve el foco al botón que lo abrió',!(await p.locator('mat-dialog-container,[role=dialog]').count())&&/Nueva cartera/.test(a.texto),JSON.stringify(a));
 await ctx.close();
 // Móvil
 ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});p=await login(ctx);
 await p.focus('#menu-toggle');await p.keyboard.press('Enter');await p.waitForTimeout(150);
 rec('K-13','Enter abre el menú móvil y aria-expanded=true',await p.locator('#mobile-navigation').isVisible()&&(await p.getAttribute('#menu-toggle','aria-expanded'))==='true','');
 await p.keyboard.press('Escape');await p.waitForTimeout(150);a=await active(p);
 rec('K-14','Escape cierra el menú móvil y devuelve el foco al botón',!(await p.locator('#mobile-navigation').count())&&a.id==='menu-toggle',JSON.stringify(a));
 await ctx.close();
 // Reflujo 320 px
 ctx=await b.newContext({viewport:{width:320,height:640}});p=await login(ctx);const anchas=[];
 for(const r of ['/panel','/carteras','/presupuestos','/recurrentes','/deudas','/metas','/grupos','/perfil','/ia']){await p.goto(base+r,{waitUntil:'networkidle'});await p.waitForTimeout(300);
  const w=await p.evaluate(()=>document.documentElement.scrollWidth);if(w>320)anchas.push(`${r}:${w}px`);}
 rec('K-15','Reflujo a 320 px sin desplazamiento horizontal en las 10 vistas',anchas.length===0,anchas.join(', ')||'todas 320 px');
 await ctx.close();await b.close();
 fs.writeFileSync(out,JSON.stringify(res,null,1));for(const r of res)console.log(r.id,r.resultado,r.desc,r.resultado==='FALLA'?r.detalle:'');
})().catch(e=>{console.error(e);process.exit(1);});
