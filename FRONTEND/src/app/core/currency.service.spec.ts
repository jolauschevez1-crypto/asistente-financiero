import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { CurrencyService, formatCurrency } from './currency.service';
describe('Moneda de la cuenta',()=>{
 let service:CurrencyService,http:HttpTestingController;
 const usuario=signal({id:1,moneda:'COP'});
 beforeEach(()=>{
  usuario.set({id:1,moneda:'COP'});
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{usuario,actualizarUsuarioLocal:(data:{moneda:string})=>usuario.update(u=>({...u,...data}))}}]});
  service=TestBed.inject(CurrencyService);http=TestBed.inject(HttpTestingController);
 });
 afterEach(()=>http.verify());
 it('muestra código y valor nominal sin conversión',()=>{
  expect(formatCurrency(1250,'COP')).toContain('COP');
  expect(formatCurrency(1250,'MXN')).toContain('1,250.00');
  expect(formatCurrency(1250,'USD')).toContain('USD');
 });
 it('guarda en servidor y actualiza el usuario solamente al confirmar',()=>{
  service.save('MXN');expect(usuario().moneda).toBe('COP');
  const req=http.expectOne('/api/finanzas/preferencias');expect(req.request.method).toBe('PATCH');expect(req.request.body).toEqual({moneda:'MXN'});
  req.flush({success:true,data:{moneda:'MXN',puede_cambiar:true,motivo:null,monedas:[]}});
  expect(usuario().moneda).toBe('MXN');expect(service.guardando()).toBeFalse();
 });
 it('conserva COP y muestra rechazo cuando ya existe actividad',()=>{
  service.save('MXN');http.expectOne('/api/finanzas/preferencias').flush({message:'Hay movimientos registrados',code:'MONEDA_BLOQUEADA'},{status:409,statusText:'Conflict'});
  expect(usuario().moneda).toBe('COP');expect(service.error()).toContain('movimientos');
 });
 it('descarta respuestas de una sesión anterior',()=>{
  service.load();usuario.set({id:2,moneda:'PEN'});
  http.expectOne('/api/finanzas/preferencias').flush({success:true,data:{moneda:'COP',puede_cambiar:true,motivo:null,monedas:[]}});
  expect(usuario().moneda).toBe('PEN');expect(service.preferencias()).toBeNull();
 });
});
