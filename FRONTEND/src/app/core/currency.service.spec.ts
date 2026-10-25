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
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{usuario,isAdmin:()=>false,actualizarUsuarioLocal:(data:{moneda:string})=>usuario.update(u=>({...u,...data}))}}]});
  service=TestBed.inject(CurrencyService);http=TestBed.inject(HttpTestingController);
 });
 afterEach(()=>http.verify());
 it('muestra código y valor nominal sin conversión',()=>{
  expect(formatCurrency(1250,'COP')).toContain('COP');
  expect(formatCurrency(1250,'MXN')).toContain('1,250.00');
  expect(formatCurrency(1250,'USD')).toContain('USD');
 });
 it('pone siempre el código delante, también en euros y en negativos',()=>{
  expect(formatCurrency(850,'EUR')).toBe('EUR\u00a0850,00');
  expect(formatCurrency(1044.44,'USD')).toBe('USD\u00a01.044,44');
  expect(formatCurrency(-12.5,'EUR')).toBe('-EUR\u00a012,50');
  expect(formatCurrency('abc','USD')).toBe('USD\u00a00,00');
 });
 it('guarda en servidor y actualiza el usuario solamente al confirmar',()=>{
  service.save('MXN');expect(usuario().moneda).toBe('COP');
  const req=http.expectOne('/api/finanzas/preferencias');expect(req.request.method).toBe('PATCH');expect(req.request.body).toEqual({moneda:'MXN'});
  req.flush({success:true,data:{moneda:'MXN',puede_cambiar:true,motivo:null,monedas:[]}});
  expect(usuario().moneda).toBe('MXN');expect(service.guardando()).toBeFalse();
 });
 it('conserva la moneda anterior si el servidor rechaza el cambio',()=>{
  service.save('MXN');http.expectOne('/api/finanzas/preferencias').flush({message:'Moneda no válida'},{status:400,statusText:'Bad Request'});
  expect(usuario().moneda).toBe('COP');expect(service.error()).toContain('Moneda');
 });
 it('solo ofrece como presentación las monedas con tasa de referencia',()=>{
  expect(service.presentables().map(c=>c.codigo)).toEqual(['USD','MXN','EUR']);
 });
 it('descarta respuestas de una sesión anterior',()=>{
  service.load();usuario.set({id:2,moneda:'PEN'});
  http.expectOne('/api/finanzas/preferencias').flush({success:true,data:{moneda:'COP',puede_cambiar:true,motivo:null,monedas:[]}});
  expect(usuario().moneda).toBe('PEN');expect(service.preferencias()).toBeNull();
 });
 it('muestra importes en la moneda elegida con la tasa del servidor; sin tasa, en su moneda',()=>{
  usuario.set({id:1,moneda:'EUR'});TestBed.tick();
  http.expectOne('/api/finanzas/tasas?moneda=EUR').flush({success:true,data:{moneda:'EUR',tasas_a:{USD:'0.9',EUR:'1',MXN:'0.05'},fecha_cotizacion:'2026-10-23'}});
  expect(service.converted('10.00','USD')).toBe('9.00');
  expect(service.converted('5','EUR')).toBe('5.00');
  expect(service.display('10','USD')).toBe('EUR\u00a09,00');
  expect(service.converted('1000','COP')).toBeNull();
  expect(service.display('1000','COP')).toContain('COP');
  expect(service.tasasFecha()).toBe('2026-10-23');
 });
});
