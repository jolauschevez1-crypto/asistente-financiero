import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { NgForm } from '@angular/forms';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { FinancePage } from './finance';
import { FinanceService } from '../../core/finance.service';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { CurrencyService, formatCurrency } from '../../core/currency.service';
import { SnackbarService } from '../../core/snackbar.service';

// Carteras con selector de moneda (CR-04): se muestra todo en la moneda elegida, nada guardado cambia.
describe('Carteras con moneda elegida', () => {
  let post: jasmine.Spy;
  const wallets = [{ id: 1, nombre: 'Banco', moneda: 'USD', saldo_actual: '100.00' }, { id: 2, nombre: 'Euros', moneda: 'EUR', saldo_actual: '5.00' }];
  const quote = { moneda_origen: 'USD', moneda_destino: 'EUR', monto_origen: '10.00', monto_destino: '9.00', conversion: true,
    cotizacion: { tasa: '0.9', fuente: 'frankfurter-bce', fecha_cotizacion: '2026-10-23', estado: 'vigente', antiguedad_dias: 2 } };
  const presentacion = signal('EUR');
  const toEur = (v: unknown, c: string) => c === 'EUR' ? Number(v).toFixed(2) : c === 'USD' ? (Number(v) * 0.9).toFixed(2) : null;
  const currency = { presentacion, codigo: presentacion, presentables: signal([{ codigo: 'USD', nombre: 'Dólar' }, { codigo: 'EUR', nombre: 'Euro' }]), guardando: signal(false), tasasFecha: signal('2026-10-23'),
    converted: toEur, display: (v: unknown, c: string) => { const x = toEur(v, c); return x === null ? formatCurrency(v as string, c) : formatCurrency(x, 'EUR'); }, save: jasmine.createSpy('save') };
  beforeEach(async () => {
    sessionStorage.clear();
    post = jasmine.createSpy('post').and.callFake((path: string) => of(path === 'transferencias/preview' ? quote : { id: 9 }));
    await TestBed.configureTestingModule({
      imports: [FinancePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: of({ section: 'carteras' }) } },
        { provide: AuthService, useValue: { usuario: signal({ id: 1, nombre: 'Prueba', correo: 'p@local.test', moneda: 'EUR' }), actualizarUsuarioLocal: () => {} } },
        { provide: FinanceService, useValue: { get: (path: string) => of(path === 'carteras' ? wallets : []), post, put: post } },
        { provide: ApiService, useValue: { listarMisMovimientos: () => of([]), registrarMovimiento: () => of({}) } },
        { provide: SnackbarService, useValue: { exito: () => {}, error: () => {} } },
        { provide: CurrencyService, useValue: currency },
      ],
    }).compileComponents();
  });

  it('muestra cada cartera y el total en la moneda elegida, con el importe guardado al lado', () => {
    const fixture = TestBed.createComponent(FinancePage); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('EUR 90,00');          // 100 USD × 0,9
    expect(text).toContain('Guardada en USD 100,00');
    expect(text).toContain('EUR 95,00 en total');
    expect(text).toContain('Lo que tienes guardado y tu historial no cambian');
    expect(text).not.toContain('Movimientos');           // ya no hay enlace al módulo retirado
  });

  it('crear cartera solo pide nombre y saldo inicial y usa la moneda elegida', () => {
    const fixture = TestBed.createComponent(FinancePage); fixture.detectChanges();
    const page = fixture.componentInstance;
    page.openForm(); fixture.detectChanges();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role=dialog]') as HTMLElement;
    expect(dialog.querySelectorAll('input,select').length).toBe(2);
    expect(dialog.textContent).not.toContain('Moneda');
    page.form.nombre = 'Ahorros'; page.form.monto = '20';
    page.submit({ control: { markAllAsTouched: () => {} }, invalid: false } as unknown as NgForm);
    expect(post).toHaveBeenCalledWith('carteras', { nombre: 'Ahorros', saldo_inicial: '20', moneda: 'EUR' });
  });

  it('transferencia entre monedas: pide la cotización y solo registra al confirmar con la misma tasa', () => {
    const fixture = TestBed.createComponent(FinancePage); fixture.detectChanges();
    const page = fixture.componentInstance;
    const form = { control: { markAllAsTouched: () => {} }, invalid: false } as unknown as NgForm;
    page.openTransfer(); page.transfer = { origen_id: '1', destino_id: '2', monto: '10', descripcion: '' };
    page.submitTransfer(form); fixture.detectChanges();
    expect(post).toHaveBeenCalledWith('transferencias/preview', { origen_id: 1, destino_id: 2, monto: '10' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('tasa de referencia BCE');
    page.submitTransfer(form);
    const [path, body] = post.calls.mostRecent().args;
    expect(path).toBe('transferencias');
    expect(body).toEqual(jasmine.objectContaining({ origen_id: 1, destino_id: 2, monto: '10', confirmar: true, tasa: '0.9' }));
    expect(typeof body.idempotencia).toBe('string');
  });

  it('cambiar el monto descarta la cotización anterior', () => {
    const fixture = TestBed.createComponent(FinancePage); fixture.detectChanges();
    const page = fixture.componentInstance;
    page.transfer = { origen_id: '1', destino_id: '2', monto: '10', descripcion: '' };
    page.submitTransfer({ control: { markAllAsTouched: () => {} }, invalid: false } as unknown as NgForm);
    expect(page.transferQuote).not.toBeNull();
    page.resetTransferQuote();
    expect(page.transferQuote).toBeNull();
  });
});
