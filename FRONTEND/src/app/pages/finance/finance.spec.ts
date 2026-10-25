import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { FinancePage } from './finance';
import { FinanceService } from '../../core/finance.service';
import { AuthService } from '../../core/auth.service';

const panel = {
  moneda: 'USD', mes: '2026-10', saldo_total: '155.56', saldo_total_completo: false,
  saldos_por_moneda: [{ moneda: 'COP', saldo: '1000.00', convertido: null, tasa: null }, { moneda: 'EUR', saldo: '50.00', convertido: '55.56', tasa: '1.111111111111' }, { moneda: 'USD', saldo: '100.00', convertido: '100.00', tasa: '1' }],
  saldos_sin_convertir: [{ moneda: 'COP', saldo: '1000.00' }],
  ingresos: '155.56', gastos: '0.00', neto: '155.56', flujos_completos: false, flujos_por_moneda: [], flujos_sin_tasa: { ingresos: [{ moneda: 'COP', monto: '1000.00' }], gastos: [] },
  tasas: { estado: 'vigente', fuente: 'frankfurter-bce', fecha_cotizacion: '2026-10-24', obtenida_en: null, antiguedad_dias: 1 },
  tasas_a_base: { USD: '1', EUR: '1.111111111111', MXN: '0.055555555556', COP: null },
  tendencia: [], gastos_categoria: [],
  carteras: [{ id: 1, nombre: 'Banco', moneda: 'USD', saldo_actual: '100.00' }, { id: 2, nombre: 'Euros', moneda: 'EUR', saldo_actual: '50.00' }, { id: 3, nombre: 'Pesos', moneda: 'COP', saldo_actual: '1000.00' }],
  presupuestos: [], metas: [], grupos: [], alertas: [], recurrentes: [],
  deudas: [{ id: 1, nombre: 'Préstamo', contraparte: 'Banco', tipo: 'PAGAR', moneda: 'EUR', monto: '20.00', pagado: '0.00', pendiente: '20.00', estado: 'PENDIENTE' },
           { id: 2, nombre: 'Tienda', contraparte: 'Ana', tipo: 'PAGAR', moneda: 'COP', monto: '500.00', pagado: '0.00', pendiente: '500.00', estado: 'PENDIENTE' }],
};

describe('Panel multidivisa', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancePage],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: of({ section: 'panel' }) } },
        { provide: AuthService, useValue: { usuario: signal({ id: 1, nombre: 'Prueba', correo: 'p@local.test', moneda: 'USD' }), actualizarUsuarioLocal: () => {} } },
        { provide: FinanceService, useValue: { get: (path: string) => of(path.startsWith('panel') ? panel : []) } },
      ],
    }).compileComponents();
  });

  it('marca el total como parcial y nombra la moneda sin tasa', () => {
    const fixture = TestBed.createComponent(FinancePage); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Total parcial');
    expect(text).toContain('COP');
    expect(text).toContain('no en tiempo real');
  });

  it('convierte pendientes con BigInt y deja aparte lo que no tiene tasa', () => {
    const fixture = TestBed.createComponent(FinancePage); fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.payable.total).toBe('22.22'); // 20 EUR × 1.111111111111
    expect(page.payable.sinTasa).toEqual([{ moneda: 'COP', monto: '500.00' }]);
    expect(page.liquid.total).toBe('155.56');
    expect(page.minus(page.liquid.total, page.payable.total)).toBe('133.34');
  });
});

describe('Diálogo Crear nueva cartera (accesibilidad)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancePage],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: of({ section: 'carteras' }) } },
        { provide: AuthService, useValue: { usuario: signal({ id: 1, nombre: 'Prueba', correo: 'p@local.test', moneda: 'USD' }), actualizarUsuarioLocal: () => {} } },
        { provide: FinanceService, useValue: { get: (path: string) => of(path.startsWith('panel') ? panel : []) } },
      ],
    }).compileComponents();
  });

  it('mantiene el botón que abre el diálogo para que el foco vuelva a él al cerrar', () => {
    const fixture = TestBed.createComponent(FinancePage); fixture.detectChanges();
    const opener = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b => b.textContent?.trim() === 'Crear nueva cartera');
    const before = opener();
    expect(before).toBeTruthy();
    fixture.componentInstance.openForm(); fixture.detectChanges();
    expect(opener()).toBe(before);
  });
});
