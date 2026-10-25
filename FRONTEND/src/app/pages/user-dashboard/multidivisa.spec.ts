import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { UserDashboard } from './user-dashboard';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FinanceService } from '../../core/finance.service';
import { SnackbarService } from '../../core/snackbar.service';

describe('Traspasos entre carteras de distinta moneda', () => {
  let api: jasmine.SpyObj<ApiService>;
  let post: jasmine.Spy;
  const quote = { moneda_origen: 'USD', moneda_destino: 'EUR', monto_origen: '10.00', monto_destino: '9.00', conversion: true,
    cotizacion: { tasa: '0.9', fuente: 'frankfurter-bce', fecha_cotizacion: '2026-10-23', estado: 'vigente', antiguedad_dias: 2 } };
  beforeEach(async () => {
    sessionStorage.clear();
    api = jasmine.createSpyObj('ApiService', ['obtenerMisCuentas', 'listarMisMovimientos', 'registrarMovimiento']);
    api.obtenerMisCuentas.and.returnValue(of({ cuentas: [{ id: 1, nombre: 'Banco', moneda: 'USD', saldo_actual: 100 }, { id: 2, nombre: 'Euros', moneda: 'EUR', saldo_actual: 5 }], balances: [{ moneda: 'EUR', total: '5.00' }, { moneda: 'USD', total: '100.00' }], balance_total: 0 }));
    api.listarMisMovimientos.and.returnValue(of([]));
    post = jasmine.createSpy('post').and.callFake((path: string) => of(path === 'transferencias/preview' ? quote : { movimiento_id: 9 }));
    await TestBed.configureTestingModule({
      imports: [UserDashboard],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { usuario: signal({ id: 1, nombre: 'Prueba', correo: 'prueba@local.test', moneda: 'USD' }), logout: jasmine.createSpy() } },
        { provide: FinanceService, useValue: { get: () => of([]), post } },
        { provide: SnackbarService, useValue: { exito: jasmine.createSpy(), error: jasmine.createSpy() } },
      ],
    }).compileComponents();
  });

  it('muestra saldos por moneda sin sumarlos', () => {
    const fixture = TestBed.createComponent(UserDashboard); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).querySelector('.balance-card')?.textContent || '';
    expect(text).toContain('USD'); expect(text).toContain('EUR'); expect(text).toContain('No se suman monedas distintas');
  });

  it('pide la cotización, la muestra y solo registra al confirmar con la misma tasa', () => {
    const fixture = TestBed.createComponent(UserDashboard); fixture.detectChanges();
    const c = fixture.componentInstance;
    c.cambiarSeccion('nuevo-movimiento');
    c.movimientoForm.patchValue({ tipo: 'TRANSFERENCIA', monto: 10, cuenta_origen: 'Banco', cuenta_destino: 'Euros' });
    c.registrarMovimiento(); fixture.detectChanges();
    expect(api.registrarMovimiento).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('transferencias/preview', { origen_id: 1, destino_id: 2, monto: '10' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('tasa de referencia BCE');
    c.registrarMovimiento();
    const [path, body] = post.calls.mostRecent().args;
    expect(path).toBe('transferencias');
    expect(body).toEqual(jasmine.objectContaining({ origen_id: 1, destino_id: 2, monto: '10', confirmar: true, tasa: '0.9' }));
    expect(typeof body.idempotencia).toBe('string');
  });

  it('un cambio en el formulario descarta la cotización anterior', () => {
    const fixture = TestBed.createComponent(UserDashboard); fixture.detectChanges();
    const c = fixture.componentInstance;
    c.movimientoForm.patchValue({ tipo: 'TRANSFERENCIA', monto: 10, cuenta_origen: 'Banco', cuenta_destino: 'Euros' });
    c.registrarMovimiento(); expect(c.cotizacion()).not.toBeNull();
    c.movimientoForm.patchValue({ monto: 20 });
    expect(c.cotizacion()).toBeNull();
  });
});
