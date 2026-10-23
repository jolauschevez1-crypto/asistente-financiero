// Regression cases from the original audit, applied to the improved version. Services remain doubles.
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UserDashboard } from '../app/pages/user-dashboard/user-dashboard';
import { Estadisticas } from '../app/pages/estadisticas/estadisticas';
import { ApiService } from '../app/core/api.service';
import { AuthService } from '../app/core/auth.service';
import { SnackbarService } from '../app/core/snackbar.service';
import { DashboardCacheService } from '../app/core/dashboard-cache.service';
import { FinanceService } from '../app/core/finance.service';

const started = new Map<string, number>();
jasmine.getEnv().addReporter({
  specStarted: result => { started.set(result.id, performance.now()); },
  specDone: result => console.log('AUDIT_RESULT ' + JSON.stringify({
    name: result.fullName,
    status: result.status,
    durationMs: performance.now() - (started.get(result.id) || performance.now()),
    failures: result.failedExpectations.map(item => item.message),
  })),
});

function observation(id: string, expected: unknown, actual: unknown): void {
  console.log('AUDIT_OBSERVATION ' + JSON.stringify({ id, expected, actual }));
}

// Independent CSV reader: quotes, escaped quotes, commas and embedded newlines.
function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if (c === '\n' && !quoted) { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r' || quoted) field += c;
  }
  row.push(field); rows.push(row);
  return rows;
}

describe('Regresión de defectos originales', () => {
  let api: any, snack: any, user: UserDashboard;
  beforeEach(() => {
    api = {
      registrarMovimiento: jasmine.createSpy('registrarMovimiento').and.returnValue(of({})),
      obtenerMisCuentas: jasmine.createSpy('obtenerMisCuentas').and.returnValue(of({ balance_total: 100, cuentas: [] })),
      listarMisMovimientos: jasmine.createSpy('listarMisMovimientos').and.returnValue(of([])),
      crearCuenta: jasmine.createSpy('crearCuenta').and.returnValue(of({})),
      generarReporte: jasmine.createSpy('generarReporte'),
    };
    snack = { error: jasmine.createSpy('error'), exito: jasmine.createSpy('exito') };
    TestBed.configureTestingModule({ providers: [
      FormBuilder,
      { provide: ApiService, useValue: api },
      { provide: AuthService, useValue: { usuario: signal({ id: 9001, rol: 'USUARIO', nombre: 'Auditoria' }) } },
      { provide: SnackbarService, useValue: snack },
      { provide: DashboardCacheService, useValue: { obtenerDashboardAdmin: () => of({}) } },
      { provide: FinanceService, useValue: {get: () => of([])} },
    ] });
    user = TestBed.runInInjectionContext(() => new UserDashboard());
    user.movimientoForm.setValue({ tipo: 'GASTO', categoria: 'Prueba', categoriaPersonalizada: '', monto: 10, cuenta_origen: 'A', cuenta_destino: '', descripcion: 'Dato ficticio', metodo_pago: 'EFECTIVO' });
  });

  it('FE-T01 [RF-MOV] gasto valido solicita registro una vez', () => {
    user.registrarMovimiento();
    observation('FE-T01', 1, api.registrarMovimiento.calls.count());
    expect(api.registrarMovimiento).toHaveBeenCalledTimes(1);
    expect(api.registrarMovimiento.calls.mostRecent().args[0].monto).toBe(10);
  });

  it('FE-T02 [FE-01/RF-MOV] cambiar transferencia invalida a gasto permite registrar', () => {
    user.movimientoForm.controls.tipo.setValue('TRANSFERENCIA');
    user.registrarMovimiento();
    expect(api.registrarMovimiento).not.toHaveBeenCalled();
    user.movimientoForm.controls.tipo.setValue('GASTO');
    user.registrarMovimiento();
    observation('FE-T02', { requests: 1, destinationErrors: null }, { requests: api.registrarMovimiento.calls.count(), destinationErrors: user.movimientoForm.controls.cuenta_destino.errors });
    expect(api.registrarMovimiento).toHaveBeenCalledTimes(1);
  });

  it('FE-T03 [RF-TRANSFER] transferencia entre dos cuentas solicita registro', () => {
    user.movimientoForm.patchValue({ tipo: 'TRANSFERENCIA', cuenta_destino: 'B' });
    user.registrarMovimiento();
    observation('FE-T03', 1, api.registrarMovimiento.calls.count());
    expect(api.registrarMovimiento).toHaveBeenCalledTimes(1);
  });

  it('FE-T04 [RF-TRANSFER] origen igual a destino se rechaza con mensaje', () => {
    user.movimientoForm.patchValue({ tipo: 'TRANSFERENCIA', cuenta_destino: 'A' });
    user.registrarMovimiento();
    observation('FE-T04', { requests: 0, errorVisible: true }, { requests: api.registrarMovimiento.calls.count(), errorVisible: !!user.error() });
    expect(api.registrarMovimiento).not.toHaveBeenCalled();
    expect(user.error()).toContain('diferente');
  });

  it('FE-T05 [RF-MOV] monto cero se rechaza sin solicitud', () => {
    user.movimientoForm.controls.monto.setValue(0);
    user.registrarMovimiento();
    observation('FE-T05', 0, api.registrarMovimiento.calls.count());
    expect(api.registrarMovimiento).not.toHaveBeenCalled();
    expect(user.movimientoForm.controls.monto.invalid).toBeTrue();
  });

  async function exportRows(method: string, date?: string, description = 'Dato ficticio'): Promise<string[][]> {
    let captured: Blob | null = null;
    spyOn(URL, 'createObjectURL').and.callFake(blob => { captured = blob as Blob; return 'blob:auditoria-ficticia'; });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');
    user.movimientos.set([{ id: 1, tipo: 'INGRESO', categoria: 'Salario', monto: 100, descripcion: description, metodo_pago: method, fecha: date }]);
    user.exportarCsv();
    if (!captured) throw new Error('No CSV blob captured');
    return parseCsv(await (captured as Blob).text());
  }

  it('FE-T06 [FE-02/RF-EXPORT] CSV preserva metodo con coma y columna de moneda', async () => {
    const rows = await exportRows('TARJETA, VISA');
    observation('FE-T06', { columns: 8, payment: 'TARJETA, VISA' }, { columns: rows[1].length, row: rows[1] });
    expect(rows[1].length).toBe(rows[0].length);
    expect(rows[1][5]).toBe('USD');
    expect(rows[1][7]).toBe('TARJETA, VISA');
  });

  it('FE-T07 [RF-EXPORT] CSV preserva comillas comas y salto de linea de descripcion', async () => {
    const description = 'Texto "citado", línea 1\nlínea 2';
    const rows = await exportRows('EFECTIVO', undefined, description);
    observation('FE-T07', { columns: 8, description }, { columns: rows[1].length, description: rows[1][6] });
    expect(rows.length).toBe(2);
    expect(rows[1].length).toBe(8);
    expect(rows[1][6]).toBe(description);
  });

  it('FE-T08 [FE-02/RF-EXPORT] CSV con fecha conserva ocho columnas incluida moneda', async () => {
    const rows = await exportRows('EFECTIVO', '2026-10-16T17:00:00Z');
    observation('FE-T08', { columns: 8 }, { columns: rows[1].length, row: rows[1] });
    expect(rows[1].length).toBe(8);
  });

  it('FE-T09 [FE-04/RNF-ERROR] consulta fallida de detalle hace visible el error', () => {
    api.generarReporte.and.returnValue(throwError(() => ({ status: 500, error: { message: 'Fallo sintético de auditoría' } })));
    const stats = TestBed.runInInjectionContext(() => new Estadisticas());
    stats.cargarMovimientos();
    observation('FE-T09', { errorVisible: true }, { errorVisible: !!stats.error(), promedioDiario: stats.promedioDiario(), mayorIngreso: stats.mayorIngreso() });
    expect(stats.error().length).toBeGreaterThan(0);
  });

  it('FE-T10 [RF-STATS] datos disponibles producen maximo y promedio conocidos', () => {
    api.generarReporte.and.returnValue(of({ resumen: {}, datos: [
      { id: 1, tipo: 'INGRESO', monto: 100, fecha: '2026-10-01T12:00:00Z' },
      { id: 2, tipo: 'GASTO', monto: 50, fecha: '2026-10-02T12:00:00Z' },
    ] }));
    const stats = TestBed.runInInjectionContext(() => new Estadisticas());
    stats.cargarMovimientos();
    observation('FE-T10', { averagePerActiveDay: 75, maxIncome: 100 }, { averagePerActiveDay: stats.promedioDiario(), maxIncome: stats.mayorIngreso()?.monto });
    expect(stats.promedioDiario()).toBe(75);
    expect(stats.mayorIngreso()?.monto).toBe(100);
  });
});
