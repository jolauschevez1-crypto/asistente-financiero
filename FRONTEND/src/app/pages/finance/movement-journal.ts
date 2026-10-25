import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { FinanceService } from '../../core/finance.service';
import { CurrencyService, formatCurrency } from '../../core/currency.service';
import { SnackbarService } from '../../core/snackbar.service';
import { Movimiento } from '../../core/models';
import { Wallet } from '../../core/finance.models';
import { csvDocument } from '../../core/csv';
import { moneyAmount, nonBlank } from '../../core/input-validation';
import { buildCategoryOptions, CUSTOM_CATEGORY_VALUE } from '../../core/category-options';

/**
 * Diario de movimientos y alta de gastos o ingresos, dentro de Carteras (el antiguo módulo Movimientos).
 * Los traspasos entre carteras se hacen con «Transferir». Los importes se muestran en la moneda elegida
 * en el selector; el movimiento se guarda siempre en la moneda de su cartera.
 */
@Component({
  selector: 'app-movement-journal',
  imports: [ReactiveFormsModule, CdkTrapFocus],
  templateUrl: './movement-journal.html',
  styleUrl: './movement-journal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementJournal implements OnInit {
  private readonly api = inject(ApiService);
  private readonly financeApi = inject(FinanceService);
  private readonly fb = inject(FormBuilder);
  private readonly snackbar = inject(SnackbarService);
  readonly moneda = inject(CurrencyService);

  private readonly walletList = signal<Wallet[]>([]);
  @Input() set wallets(value: Wallet[]) { this.walletList.set(value || []); }
  get wallets(): Wallet[] { return this.walletList(); }
  @Output() readonly changed = new EventEmitter<void>();

  readonly movimientos = signal<Movimiento[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly abierto = signal(false);
  readonly error = signal('');
  readonly periodo = signal<'todo' | 'mes' | 'semana'>('todo');
  readonly busqueda = signal('');
  readonly visibles = signal(8);
  readonly busquedaControl = this.fb.control('');
  readonly custom = CUSTOM_CATEGORY_VALUE;
  private readonly catalogo = signal<string[]>([]);
  readonly categorias = computed(() => buildCategoryOptions([...this.catalogo(), ...this.movimientos().map(m => m.categoria)]));

  readonly form = this.fb.nonNullable.group({
    tipo: ['GASTO' as 'GASTO' | 'INGRESO', Validators.required],
    descripcion: ['', Validators.maxLength(250)],
    categoria: ['Otros', [Validators.required, nonBlank, Validators.maxLength(100)]],
    categoriaPersonalizada: [''],
    monto: ['', [Validators.required, moneyAmount]],
    cuenta: ['', Validators.required],
  });

  readonly filtrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const periodo = this.periodo();
    const hoy = new Date();
    return this.movimientos().filter(m => {
      if (q && ![m.categoria, m.descripcion, m.cuenta_origen, m.cuenta_destino].some(t => t?.toLowerCase().includes(q))) return false;
      if (!m.fecha || periodo === 'todo') return true;
      const f = new Date(m.fecha);
      if (periodo === 'mes') return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
      return (hoy.getTime() - f.getTime()) / 86400000 <= 7;
    });
  });

  ngOnInit(): void {
    this.reload();
    this.financeApi.get<{ nombre: string }[]>('categorias').subscribe({ next: c => this.catalogo.set(c.map(x => x.nombre)), error: () => {} });
    this.busquedaControl.valueChanges.pipe(debounceTime(250)).subscribe(v => { this.busqueda.set(v || ''); this.visibles.set(8); });
  }

  reload(): void {
    this.cargando.set(true);
    this.api.listarMisMovimientos().subscribe({
      next: m => { this.movimientos.set(m || []); this.cargando.set(false); },
      error: e => { this.cargando.set(false); this.error.set(e?.error?.message || 'No se pudo cargar tu diario.'); },
    });
  }

  open(): void {
    this.error.set('');
    this.form.reset({ tipo: 'GASTO', descripcion: '', categoria: 'Otros', categoriaPersonalizada: '', monto: '', cuenta: this.wallets.length === 1 ? this.wallets[0].nombre : '' });
    this.abierto.set(true);
  }
  close(): void { if (!this.guardando()) this.abierto.set(false); }

  walletCurrency(): string { return this.wallets.find(w => w.nombre === this.form.controls.cuenta.value)?.moneda || this.moneda.presentacion(); }
  show(value: number | string | null | undefined, code?: string | null): string { return this.moneda.display(value, code || this.moneda.presentacion()); }
  original(m: Movimiento): string | null {
    const code = m.moneda || this.moneda.presentacion();
    return code !== this.moneda.presentacion() && this.moneda.converted(m.monto, code) !== null ? formatCurrency(m.monto, code) : null;
  }
  private readonly dates = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });
  detail(m: Movimiento): string { return [m.cuenta_origen || m.cuenta_destino, m.categoria, m.fecha ? this.dates.format(new Date(m.fecha)).replace('.', '') : ''].filter(Boolean).join(' · '); }
  icon(m: Movimiento): string { return m.tipo === 'INGRESO' ? '↓' : m.tipo === 'TRANSFERENCIA' ? '↔' : '↑'; }
  sign(m: Movimiento): string { return m.tipo === 'GASTO' ? '−' : m.tipo === 'INGRESO' ? '+' : ''; }

  updateCustomCategory(): void {
    const c = this.form.controls.categoriaPersonalizada;
    c.setValidators(this.form.controls.categoria.value === CUSTOM_CATEGORY_VALUE ? [Validators.required, nonBlank, Validators.maxLength(100)] : []);
    c.updateValueAndValidity();
  }

  submit(): void {
    if (this.guardando()) return;
    this.updateCustomCategory();
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Elige una cartera, una categoría y un monto mayor que cero con hasta dos decimales.'); return; }
    const v = this.form.getRawValue();
    this.guardando.set(true); this.error.set('');
    this.api.registrarMovimiento({
      tipo: v.tipo,
      categoria: (v.categoria === CUSTOM_CATEGORY_VALUE ? v.categoriaPersonalizada : v.categoria).trim(),
      monto: Number(v.monto),
      cuenta_origen: v.cuenta,
      cuenta_destino: null,
      descripcion: v.descripcion.trim() || null,
    }).subscribe({
      next: () => { this.guardando.set(false); this.abierto.set(false); this.snackbar.exito(v.tipo === 'GASTO' ? 'Gasto registrado.' : 'Ingreso registrado.'); this.reload(); this.changed.emit(); },
      error: e => { this.guardando.set(false); this.error.set(e?.error?.message || 'No se pudo registrar el movimiento.'); },
    });
  }

  exportCsv(): void {
    const lista = this.filtrados();
    if (!lista.length) { this.snackbar.error('No hay movimientos para exportar.'); return; }
    const filas = lista.map(m => [m.id, m.fecha ? new Date(m.fecha).toLocaleString('es-ES') : '', m.tipo || '', m.categoria || '', m.monto || 0, m.moneda || '', m.cuenta_origen || m.cuenta_destino || '', m.descripcion || '']);
    const csv = csvDocument([['ID', 'Fecha', 'Tipo', 'Categoría', 'Monto', 'Moneda', 'Cartera', 'Descripción'], ...filas]);
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `diario_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    this.snackbar.exito('Diario exportado a CSV.');
  }
}
