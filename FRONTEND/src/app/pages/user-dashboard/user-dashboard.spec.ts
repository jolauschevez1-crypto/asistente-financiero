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
import { CUSTOM_CATEGORY_VALUE } from '../../core/category-options';

describe('Selector de categoría en movimientos', () => {
  let api: jasmine.SpyObj<ApiService>;
  beforeEach(async () => {
    api = jasmine.createSpyObj('ApiService', ['obtenerMisCuentas', 'listarMisMovimientos', 'registrarMovimiento']);
    api.obtenerMisCuentas.and.returnValue(of({ cuentas: [{ nombre: 'Efectivo', saldo_actual: 100 }], balance_total: 100 }));
    api.listarMisMovimientos.and.returnValue(of([]));
    api.registrarMovimiento.and.returnValue(of({ success: true }));
    await TestBed.configureTestingModule({
      imports: [UserDashboard],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { usuario: signal({ id: 1, nombre: 'Prueba', correo: 'prueba@local.test', moneda: 'USD' }), logout: jasmine.createSpy() } },
        { provide: FinanceService, useValue: { get: () => of([{ nombre: 'Mascotas' }, { nombre: 'Servicios' }]) } },
        { provide: SnackbarService, useValue: { exito: jasmine.createSpy(), error: jasmine.createSpy() } },
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(UserDashboard);
    fixture.detectChanges();
    fixture.componentInstance.cambiarSeccion('nuevo-movimiento');
    fixture.detectChanges();
    return fixture;
  }

  it('muestra combo accesible con catálogo guardado, sugerencias y opción personalizada', () => {
    const fixture = create();
    const select = fixture.nativeElement.querySelector('select[formControlName="categoria"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.closest('label')?.textContent).toContain('Categoría');
    expect(Array.from(select.options).map(option => option.text)).toContain('Mascotas');
    expect(Array.from(select.options).map(option => option.text)).toContain('Alimentación');
    expect(select.value).toBe('Otros');
  });

  it('rechaza categoría personalizada en blanco sin registrar un movimiento', () => {
    const fixture = create();
    fixture.componentInstance.movimientoForm.patchValue({ categoria: CUSTOM_CATEGORY_VALUE, categoriaPersonalizada: '   ', monto: 25, cuenta_origen: 'Efectivo' });
    fixture.componentInstance.registrarMovimiento();
    fixture.detectChanges();
    expect(api.registrarMovimiento).not.toHaveBeenCalled();
    expect(fixture.componentInstance.movimientoForm.controls.categoriaPersonalizada.invalid).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('no puede contener solo espacios');
  });

  it('registra el nombre personalizado y restablece la selección sin enviar el valor interno', () => {
    const fixture = create();
    fixture.componentInstance.movimientoForm.patchValue({ categoria: CUSTOM_CATEGORY_VALUE, categoriaPersonalizada: '  Mascotas  ', monto: 25, cuenta_origen: 'Efectivo' });
    fixture.componentInstance.registrarMovimiento();
    expect(api.registrarMovimiento).toHaveBeenCalledWith(jasmine.objectContaining({ categoria: 'Mascotas', monto: 25 }));
    expect(fixture.componentInstance.movimientoForm.controls.categoria.value).toBe('Otros');
    expect(fixture.componentInstance.movimientoForm.controls.categoriaPersonalizada.invalid).toBeFalse();
  });
});
