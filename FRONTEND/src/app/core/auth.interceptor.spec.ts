import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { TokenRefreshService } from './token-refresh.service';

describe('Sesión y límites del interceptor', () => {
  let http: HttpClient, requests: HttpTestingController, auth: any, refresh: any;
  beforeEach(() => {
    localStorage.setItem('asistente_financiero_refresh_token','refresh-ficticio');
    auth={getToken:()=> 'token-ficticio',logout:jasmine.createSpy('logout')};
    refresh={refreshAccessToken:jasmine.createSpy('refresh').and.returnValue(of('renovado-ficticio'))};
    TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([authInterceptor])),provideHttpClientTesting(),{provide:AuthService,useValue:auth},{provide:TokenRefreshService,useValue:refresh}]});
    http=TestBed.inject(HttpClient);requests=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>{requests.verify();localStorage.removeItem('asistente_financiero_refresh_token');});
  it('no envía credenciales a otro origen',()=>{
    http.get('https://example.test/recurso').subscribe();
    const req=requests.expectOne('https://example.test/recurso');expect(req.request.headers.has('Authorization')).toBeFalse();req.flush({});
  });
  it('no renueva ni cierra sesión cuando falta permiso 403',()=>{
    http.get('/api/recurso').subscribe({error:()=>{}});
    requests.expectOne('/api/recurso').flush({}, {status:403,statusText:'Forbidden'});
    expect(refresh.refreshAccessToken).not.toHaveBeenCalled();expect(auth.logout).not.toHaveBeenCalled();
  });
  it('renueva token expirado 401 y reintenta con la identidad renovada',()=>{
    http.get('/api/recurso').subscribe();
    requests.expectOne('/api/recurso').flush({}, {status:401,statusText:'Unauthorized'});
    const retry=requests.expectOne('/api/recurso');expect(retry.request.headers.get('Authorization')).toBe('Bearer renovado-ficticio');retry.flush({});
    expect(refresh.refreshAccessToken).toHaveBeenCalledTimes(1);expect(auth.logout).not.toHaveBeenCalled();
  });
  it('conserva la sesión cuando el reintento devuelve error de negocio',()=>{
    http.get('/api/recurso').subscribe({error:()=>{}});
    requests.expectOne('/api/recurso').flush({}, {status:401,statusText:'Unauthorized'});
    requests.expectOne('/api/recurso').flush({}, {status:400,statusText:'Bad Request'});
    expect(auth.logout).not.toHaveBeenCalled();
  });
  it('identifica sesión expirada cuando ya no puede renovarse',()=>{
    refresh.refreshAccessToken.and.returnValue(throwError(()=>({status:401})));
    http.get('/api/recurso').subscribe({error:()=>{}});
    requests.expectOne('/api/recurso').flush({}, {status:401,statusText:'Unauthorized'});
    expect(auth.logout).toHaveBeenCalledOnceWith(true);
  });
});
