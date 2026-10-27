import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { adminGuard } from './admin.guard';
// D-16: un usuario con sesión no debe ver la pantalla de inicio de sesión al abrir una ruta de administración.
describe('Guarda de administración',()=>{
 const sesion={token:'t' as string|null,admin:false,user:true};
 const ejecutar=()=>TestBed.runInInjectionContext(()=>adminGuard({} as never,{} as never)) as boolean|UrlTree;
 const url=(r:boolean|UrlTree)=>TestBed.inject(Router).serializeUrl(r as UrlTree);
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{getToken:()=>sesion.token,isAdmin:()=>sesion.admin,isUser:()=>sesion.user}}]}));
 it('deja pasar al administrador',()=>{Object.assign(sesion,{token:'t',admin:true,user:false});expect(ejecutar()).toBeTrue();});
 it('devuelve al panel a un usuario con sesión sin rol de administrador',()=>{Object.assign(sesion,{token:'t',admin:false,user:true});expect(url(ejecutar())).toBe('/panel');});
 it('manda al inicio de sesión a quien no tiene sesión',()=>{Object.assign(sesion,{token:null,admin:false,user:false});expect(url(ejecutar())).toBe('/login?motivo=admin');});
});
