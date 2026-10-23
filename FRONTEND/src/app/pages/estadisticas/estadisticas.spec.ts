import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Estadisticas } from './estadisticas';
import { ApiService } from '../../core/api.service';
import { DashboardCacheService } from '../../core/dashboard-cache.service';
describe('Estadísticas separadas por moneda',()=>{
 it('pide ambos conjuntos en COP al elegir Colombia',()=>{
  const api={generarReporte:jasmine.createSpy().and.returnValue(of({moneda:'COP',datos:[],resumen:{}}))};
  const cache={obtenerDashboardAdmin:jasmine.createSpy().and.returnValue(of({moneda:'COP',charts:{}}))};
  TestBed.configureTestingModule({providers:[{provide:ApiService,useValue:api},{provide:DashboardCacheService,useValue:cache}]});
  const page=TestBed.runInInjectionContext(()=>new Estadisticas());page.cambiarMonedaInforme('COP');
  expect(cache.obtenerDashboardAdmin).toHaveBeenCalledWith('COP');
  expect(api.generarReporte).toHaveBeenCalledWith('movimientos-fecha',{moneda:'COP'});
 });
 it('una respuesta USD tardía no reemplaza los indicadores MXN',()=>{
  const usd=new Subject<any>(),mxn=new Subject<any>();
  const cache={obtenerDashboardAdmin:(code:string)=>code==='USD'?usd:mxn};
  TestBed.configureTestingModule({providers:[{provide:ApiService,useValue:{generarReporte:()=>of({datos:[],resumen:{}})}},{provide:DashboardCacheService,useValue:cache}]});
  const page=TestBed.runInInjectionContext(()=>new Estadisticas());page.cargarDashboard();page.cambiarMonedaInforme('MXN');
  mxn.next({moneda:'MXN',charts:{}});usd.next({moneda:'USD',charts:{}});
  expect(page.dashboardData()?.moneda).toBe('MXN');
 });
});
