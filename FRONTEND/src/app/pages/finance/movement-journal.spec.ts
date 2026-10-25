import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MovementJournal } from './movement-journal';
import { ApiService } from '../../core/api.service';
import { FinanceService } from '../../core/finance.service';
import { SnackbarService } from '../../core/snackbar.service';
import { CurrencyService, formatCurrency } from '../../core/currency.service';
import { CUSTOM_CATEGORY_VALUE } from '../../core/category-options';

// Casos portados del antiguo módulo Movimientos (CR-04): el alta vive ahora en el diario de Carteras.
describe('Diario de Carteras: nuevo movimiento', () => {
  let api: jasmine.SpyObj<ApiService>;
  const usdToEur = (v: unknown, c: string) => c === 'USD' ? (Number(v) * 0.9).toFixed(2) : c === 'EUR' ? Number(v).toFixed(2) : null;
  beforeEach(async () => {
    api = jasmine.createSpyObj('ApiService', ['listarMisMovimientos', 'registrarMovimiento']);
    api.listarMisMovimientos.and.returnValue(of([{ id: 1, tipo: 'GASTO', categoria: 'Comida', monto: '10.00', moneda: 'USD', cuenta_origen: 'Efectivo', descripcion: 'Almuerzo ficticio', fecha: '2026-10-20T12:00:00Z' }]));
    api.registrarMovimiento.and.returnValue(of({ success: true }));
    await TestBed.configureTestingModule({
      imports: [MovementJournal],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: FinanceService, useValue: { get: () => of([{ nombre: 'Mascotas' }, { nombre: 'Servicios' }]) } },
        { provide: SnackbarService, useValue: { exito: jasmine.createSpy(), error: jasmine.createSpy() } },
        { provide: CurrencyService, useValue: { presentacion: signal('EUR'), converted: usdToEur, display: (v: unknown, c: string) => { const x = usdToEur(v, c); return x === null ? formatCurrency(v as string, c) : formatCurrency(x, 'EUR'); } } },
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(MovementJournal);
    fixture.componentInstance.wallets = [{ id: 1, nombre: 'Efectivo', moneda: 'USD', saldo_actual: '100.00' }];
    fixture.detectChanges();
    fixture.componentInstance.open();
    fixture.detectChanges();
    return fixture;
  }

  it('muestra combo accesible con catálogo guardado, sugerencias y opción personalizada', () => {
    const fixture = create();
    const select = fixture.nativeElement.querySelector('select[formControlName="categoria"]') as HTMLSelectElement;
    expect(select.closest('label')?.textContent).toContain('Categoría');
    const options = Array.from(select.options).map(o => o.text);
    expect(options).toContain('Mascotas');
    expect(options).toContain('Alimentación');
    expect(select.value).toBe('Otros');
  });

  it('no ofrece método de pago ni traspasos: solo gasto o ingreso', () => {
    const text = (create().nativeElement as HTMLElement).textContent || '';
    expect(text).not.toMatch(/m[eé]todo de pago/i);
    expect(text).not.toContain('Traspaso');
  });

  it('rechaza categoría personalizada en blanco sin registrar un movimiento', () => {
    const fixture = create(); const c = fixture.componentInstance;
    c.form.patchValue({ categoria: CUSTOM_CATEGORY_VALUE, categoriaPersonalizada: '   ', monto: '25', cuenta: 'Efectivo' });
    c.submit(); fixture.detectChanges();
    expect(api.registrarMovimiento).not.toHaveBeenCalled();
    expect(c.form.controls.categoriaPersonalizada.invalid).toBeTrue();
  });

  it('registra el nombre personalizado en la cartera elegida y cierra el diálogo', () => {
    const fixture = create(); const c = fixture.componentInstance;
    c.form.patchValue({ categoria: CUSTOM_CATEGORY_VALUE, categoriaPersonalizada: '  Mascotas  ', monto: '25', cuenta: 'Efectivo' });
    c.submit();
    expect(api.registrarMovimiento).toHaveBeenCalledWith(jasmine.objectContaining({ tipo: 'GASTO', categoria: 'Mascotas', monto: 25, cuenta_origen: 'Efectivo' }));
    expect(c.abierto()).toBeFalse();
  });

  it('el diario muestra el importe en la moneda elegida y el original al lado', () => {
    const fixture = create();
    const row = (fixture.nativeElement as HTMLElement).querySelector('.diary-row')?.textContent || '';
    expect(row).toContain('EUR 9,00');
    expect(row).toContain('USD 10,00');
  });
});
