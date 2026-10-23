import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('Límite absoluto de sesión',()=>{
  let router:{navigate:jasmine.Spy};
  beforeEach(()=>{localStorage.removeItem('asistente_financiero_token');router={navigate:jasmine.createSpy()};TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:Router,useValue:router}]});});
  afterEach(()=>{for(const key of ['token','refresh_token','usuario'])localStorage.removeItem('asistente_financiero_'+key);});
  function token(age:number,life:number){const now=Math.floor(Date.now()/1000);localStorage.setItem('asistente_financiero_token','header.'+btoa(JSON.stringify({iat:now-age,exp:now+life}))+'.signature');}
  it('cierra a los 30 minutos aunque el token declare una vigencia mayor',fakeAsync(()=>{token(1799,86400);TestBed.inject(AuthService);tick(1001);expect(router.navigate).toHaveBeenCalledWith(['/login'],{queryParams:{sesion:'expirada'}});expect(localStorage.getItem('asistente_financiero_token')).toBeNull();}));
  it('no reinicia el reloj al recargar una sesión vencida',()=>{token(1801,86400);TestBed.inject(AuthService);expect(router.navigate).toHaveBeenCalled();});
});
