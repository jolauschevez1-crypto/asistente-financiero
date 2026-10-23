import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, ViewChild, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth.service';
import { environment } from '../../environments/environment';

interface GoogleIdentity {
  initialize(options: {client_id:string;callback:(response:{credential:string})=>void;auto_select:boolean}):void;
  renderButton(element:HTMLElement,options:{theme:string;size:string;text:string;locale:string}):void;
}
declare global { interface Window { google?: {accounts:{id:GoogleIdentity}} } }
let library: Promise<void> | undefined;
function loadGoogle(): Promise<void> {
  if(window.google) return Promise.resolve();
  if(!library) library=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=()=>resolve();script.onerror=()=>{script.remove();library=undefined;reject(new Error('No se pudo cargar Google. Revisa tu conexión.'));};document.head.appendChild(script);
  });
  return library;
}
@Component({selector:'app-google-signin',standalone:true,template:`
  <div class="google-access"><div #button></div>@if(message()){<p role="status">{{message()}}</p>}</div>`,
  styles:[`.google-access{margin:18px 0;text-align:center}.google-access>div{display:flex;justify-content:center}p{font-size:.8rem;line-height:1.5;color:var(--af-muted,#65758b)}`]})
export class GoogleSignin implements AfterViewInit {
  @ViewChild('button',{static:true}) button!:ElementRef<HTMLElement>;
  readonly message=signal('');
  private readonly http=inject(HttpClient);private readonly auth=inject(AuthService);private readonly router=inject(Router);private readonly zone=inject(NgZone);private readonly destroy=inject(DestroyRef);
  ngAfterViewInit():void {
    this.http.get<{enabled:boolean;clientId:string|null}>(environment.apiBaseUrl+'/auth/google/config').pipe(takeUntilDestroyed(this.destroy)).subscribe({next:async config=>{
      if(!config.enabled||!config.clientId){this.message.set('El acceso con Google estará disponible cuando se complete su configuración.');return;}
      try {await loadGoogle();if(this.destroy.destroyed)return;window.google!.accounts.id.initialize({client_id:config.clientId,auto_select:false,callback:response=>this.zone.run(()=>{
        this.message.set('Verificando tu cuenta de Google…');this.auth.loginConGoogle(response.credential).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>this.router.navigateByUrl(this.auth.isAdmin()?'/admin':'/panel'),error:e=>this.message.set(e?.error?.message||'No se pudo iniciar sesión con Google.')});
      })});window.google!.accounts.id.renderButton(this.button.nativeElement,{theme:'outline',size:'large',text:'continue_with',locale:'es'});
      } catch {this.message.set('No se pudo cargar Google. Puedes entrar con correo y contraseña.');}
    },error:()=>this.message.set('Google no está disponible en este momento.')});
  }
}
