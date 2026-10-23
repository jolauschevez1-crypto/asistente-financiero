import { QuickLoad } from '../../shared/quick-load';
import { DecimalInput } from '../../shared/decimal-input';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { formatCurrency } from '../../core/currency.service';
import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CategoriaUsada, Cuenta, Movimiento, TendenciaMensual } from '../../core/models';
import { SnackbarService } from '../../core/snackbar.service';
import { buildCategoriasOptions, buildIngresosVsGastosOptions } from '../../shared/chart-card/chart-builders';
import { Notice } from '../../shared/notice/notice';
import { csvDocument } from '../../core/csv';
import { nonBlank, moneyAmount } from '../../core/input-validation';
import { FinanceService } from '../../core/finance.service';
import { buildCategoryOptions, CUSTOM_CATEGORY_VALUE } from '../../core/category-options';

type UserSection = 'cuentas' | 'movimientos' | 'crear-cuenta' | 'nuevo-movimiento';
type TipoMovimiento = 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';

@Component({
  selector: 'app-user-dashboard',
  imports: [CommonModule, ReactiveFormsModule, DatePipe, Notice, CdkTrapFocus, DecimalInput, QuickLoad],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDashboard implements OnInit {
  private readonly api = inject(ApiService);
  private readonly financeApi = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackbar = inject(SnackbarService);

  readonly usuario = this.auth.usuario;
  readonly money = formatCurrency;
  readonly cuentas = signal<Cuenta[]>([]);
  readonly movimientos = signal<Movimiento[]>([]);
  readonly balanceTotal = signal(0);
  readonly seccionActiva = signal<UserSection>('cuentas');
  readonly cargando = signal(false);
  readonly guardandoCuenta = signal(false);
  readonly guardandoMovimiento = signal(false);
  readonly error = signal('');
  readonly categoriaPersonalizadaValue = CUSTOM_CATEGORY_VALUE;
  readonly catalogoCategorias = signal<string[]>([]);
  readonly avisoCategorias = signal('');
  readonly opcionesCategorias = computed(() =>
    buildCategoryOptions([...this.catalogoCategorias(), ...this.movimientos().map(m => m.categoria)])
  );

  readonly busquedaControl = this.fb.control('');
  readonly filtroBusqueda = signal('');
  readonly filtroPresetFecha = signal<'todo' | 'mes' | 'semana'>('todo');

  readonly totalCuentas = computed(() => this.cuentas().length);
  readonly totalMovimientos = computed(() => this.movimientos().length);
  readonly ultimosMovimientos = computed(() => this.movimientos().slice(0, 6));

  readonly movimientosFiltrados = computed(() => {
    const q = this.filtroBusqueda().toLowerCase().trim();
    const preset = this.filtroPresetFecha();
    const ahora = new Date();

    return this.movimientos().filter((m) => {
      if (q) {
        const coincideTexto =
          m.categoria?.toLowerCase().includes(q) ||
          m.descripcion?.toLowerCase().includes(q) ||
          m.tipo?.toLowerCase().includes(q);
        if (!coincideTexto) return false;
      }

      if (preset === 'mes' && m.fecha) {
        const f = new Date(m.fecha);
        if (f.getMonth() !== ahora.getMonth() || f.getFullYear() !== ahora.getFullYear()) {
          return false;
        }
      } else if (preset === 'semana' && m.fecha) {
        const f = new Date(m.fecha);
        const diffTiempo = Math.abs(ahora.getTime() - f.getTime());
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
        if (diffDias > 7) return false;
      }

      return true;
    });
  });

  readonly tendenciaMensual = computed<TendenciaMensual[]>(() => {
    const mapa = new Map<string, { ingresos: number; gastos: number }>();

    this.movimientos().forEach((m) => {
      if (!m.fecha) return;
      const mesIso = m.fecha.slice(0, 7) + '-01';
      if (!mapa.has(mesIso)) {
        mapa.set(mesIso, { ingresos: 0, gastos: 0 });
      }
      const item = mapa.get(mesIso)!;
      const monto = Number(m.monto || 0);
      if (m.tipo === 'INGRESO') item.ingresos += monto;
      if (m.tipo === 'GASTO') item.gastos += monto;
    });

    const llaves = Array.from(mapa.keys()).sort();
    return llaves.map((mes) => ({
      mes,
      ingresos: mapa.get(mes)!.ingresos,
      gastos: mapa.get(mes)!.gastos,
    }));
  });

  readonly categoriasMasUsadas = computed<CategoriaUsada[]>(() => {
    const mapa = new Map<string, { cantidad: number; monto_total: number }>();

    this.movimientos().forEach((m) => {
      if (m.tipo !== 'GASTO' || !m.categoria) return;
      const cat = m.categoria;
      if (!mapa.has(cat)) {
        mapa.set(cat, { cantidad: 0, monto_total: 0 });
      }
      const item = mapa.get(cat)!;
      item.cantidad += 1;
      item.monto_total += Number(m.monto || 0);
    });

    const llaves = Array.from(mapa.keys());
    return llaves.map((cat) => ({
      categoria: cat,
      cantidad: mapa.get(cat)!.cantidad,
      monto_total: mapa.get(cat)!.monto_total,
    }));
  });

  readonly ingresosVsGastosOptions = computed(() =>
    buildIngresosVsGastosOptions(this.tendenciaMensual())
  );

  readonly categoriasOptions = computed(() =>
    buildCategoriasOptions(this.categoriasMasUsadas())
  );

  readonly cuentaForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, nonBlank, Validators.minLength(2), Validators.maxLength(100)]],
    saldo_inicial: [0, [Validators.required, Validators.min(0), Validators.max(999999999.99)]],
  });

  readonly movimientoForm = this.fb.nonNullable.group({
    tipo: ['GASTO' as TipoMovimiento, Validators.required],
    categoria: ['Otros', [Validators.required, nonBlank, Validators.maxLength(100)]],
    categoriaPersonalizada: [''],
    monto: [0, [Validators.required, moneyAmount]],
    cuenta_origen: ['', Validators.required],
    cuenta_destino: [''],
    descripcion: ['', Validators.maxLength(500)],
    metodo_pago: ['EFECTIVO'],
  });

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarCategorias();
    this.busquedaControl.valueChanges.pipe(debounceTime(300)).subscribe((val) => {
      this.filtroBusqueda.set(val || '');
    });
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');
    this.cargarCuentas();
    this.cargarMovimientos();
  }

  cargarCuentas(): void {
    this.api.obtenerMisCuentas().subscribe({
      next: (balance) => {
        this.cuentas.set(balance.cuentas || []);
        this.balanceTotal.set(Number(balance.balance_total || 0));
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cargar tus cuentas.');
      },
    });
  }

  cargarMovimientos(): void {
    this.api.listarMisMovimientos().subscribe({
      next: (movimientos) => this.movimientos.set(movimientos || []),
      error: (err) => this.error.set(err?.error?.message || 'No se pudo cargar tu historial.'),
    });
  }

  cargarCategorias(): void {
    this.financeApi.get<{ nombre: string }[]>('categorias').subscribe({
      next: (categorias) => {
        this.catalogoCategorias.set(categorias.map(c => c.nombre));
        this.avisoCategorias.set('');
      },
      error: () => this.avisoCategorias.set('No se pudo actualizar el catálogo. Puedes usar las categorías sugeridas o agregar otra.'),
    });
  }

  actualizarCategoriaPersonalizada(): void {
    const personalizada = this.movimientoForm.controls.categoriaPersonalizada;
    personalizada.setValidators(this.movimientoForm.controls.categoria.value === CUSTOM_CATEGORY_VALUE
      ? [Validators.required, nonBlank, Validators.maxLength(100)] : []);
    personalizada.updateValueAndValidity();
  }

  cambiarSeccion(seccion: UserSection): void {
    this.seccionActiva.set(seccion);
    this.limpiarAvisos();
  }

  exportarCsv(): void {
    const lista = this.movimientosFiltrados();
    if (lista.length === 0) {
      this.snackbar.error('No hay movimientos disponibles para exportar.');
      return;
    }

    const encabezados = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Monto', 'Moneda', 'Descripción', 'Método Pago'];
    const filas = lista.map((m) => [
      m.id,
      m.fecha ? new Date(m.fecha).toLocaleString('es-ES') : '',
      m.tipo || '',
      m.categoria || '',
      m.monto || 0,
      this.usuario()?.moneda || 'USD',
      m.descripcion || '',
      m.metodo_pago || '',
    ]);

    const contenidoCsv = csvDocument([encabezados, ...filas]);
    const blob = new Blob(['\ufeff' + contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `historial_movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
    this.snackbar.exito('Historial exportado a CSV correctamente.');
  }

  crearCuenta(): void {
    if (this.guardandoCuenta()) return;
    if (this.cuentaForm.invalid) {
      this.cuentaForm.markAllAsTouched();
      return;
    }

    this.guardandoCuenta.set(true);
    this.error.set('');

    const { nombre, saldo_inicial } = this.cuentaForm.getRawValue();
    this.financeApi.post('carteras', {nombre:nombre.trim(),saldo_inicial}).subscribe({
      next: () => {
        this.guardandoCuenta.set(false);
        this.snackbar.exito('Cuenta creada correctamente.');
        this.cuentaForm.reset({ nombre: '', saldo_inicial:0 });
        this.cargarMovimientos();
        this.cargarCuentas();
        this.seccionActiva.set('cuentas');
      },
      error: (err) => {
        this.guardandoCuenta.set(false);
        this.error.set(err?.error?.message || 'No se pudo crear la cartera.');
      },
    });
  }

  registrarMovimiento(): void {
    if (this.guardandoMovimiento()) return;
    const tipo = this.movimientoForm.controls.tipo.value;
    const requiereDestino = tipo === 'TRANSFERENCIA';

    const destino = this.movimientoForm.controls.cuenta_destino;
    destino.setValidators(requiereDestino ? [Validators.required] : []);
    destino.updateValueAndValidity();
    this.actualizarCategoriaPersonalizada();

    if (this.movimientoForm.invalid) {
      this.movimientoForm.markAllAsTouched();
      this.error.set('Revisa la categoría, la cuenta y el monto: debe ser positivo, con hasta dos decimales.');
      return;
    }

    const payload = this.movimientoForm.getRawValue();

    if (requiereDestino && payload.cuenta_origen === payload.cuenta_destino) {
      this.error.set('La cuenta destino debe ser diferente a la cuenta origen.');
      return;
    }

    this.guardandoMovimiento.set(true);
    this.error.set('');

    this.api
      .registrarMovimiento({
        tipo: payload.tipo,
        categoria: (payload.categoria === CUSTOM_CATEGORY_VALUE ? payload.categoriaPersonalizada : payload.categoria).trim(),
        monto: Number(payload.monto),
        cuenta_origen: payload.cuenta_origen,
        cuenta_destino: payload.cuenta_destino || null,
        descripcion: payload.descripcion || null,
        metodo_pago: payload.metodo_pago || null,
      })
      .subscribe({
        next: () => {
          this.guardandoMovimiento.set(false);
          this.snackbar.exito('Movimiento registrado correctamente.');
          this.movimientoForm.reset({
            tipo: 'GASTO',
            categoria: 'Otros',
            categoriaPersonalizada: '',
            monto: 0,
            cuenta_origen: '',
            cuenta_destino: '',
            descripcion: '',
            metodo_pago: 'EFECTIVO',
          });
          this.actualizarCategoriaPersonalizada();
          this.cargarCuentas();
          this.cargarMovimientos();
          this.cargarCategorias();
          this.seccionActiva.set('movimientos');
        },
        error: (err) => {
          this.guardandoMovimiento.set(false);
          this.error.set(err?.error?.message || 'No se pudo registrar el movimiento.');
          this.snackbar.error(this.error());
        },
      });
  }

  cerrarSesion(): void {
    this.auth.logout();
  }

  limpiarAvisos(): void {
    this.error.set('');
  }

  tipoMovimiento(movimiento: Movimiento): string {
    return movimiento.tipo || movimiento.tipo_movimiento || 'MOVIMIENTO';
  }

  saldoCuenta(cuenta: Cuenta): number {
    return Number(cuenta.saldo_actual || 0);
  }

  esSaldoBajo(cuenta: Cuenta): boolean {
    const saldo = this.saldoCuenta(cuenta);
    return saldo >= 0 && saldo < 10;
  }
}
