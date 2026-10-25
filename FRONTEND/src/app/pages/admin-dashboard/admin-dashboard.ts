import { CURRENCIES, currencyCode, formatCurrency } from '../../core/currency.service';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { formatCalendarMonth, formatReportDate } from '../../core/calendar-date';
import { AuthService } from '../../core/auth.service';
import { DashboardCacheService } from '../../core/dashboard-cache.service';
import { SnackbarService } from '../../core/snackbar.service';
import {
  BalanceAnual,
  BalanceUsuario,
  ComparativaPeriodo,
  CategoriaUsada,
  Cuenta,
  DashboardAdminData,
  ListarMovimientosGlobalesParams,
  Movimiento,
  MovimientoGlobal,
  MovimientoPayload,
  MovimientoPorDia,
  ReporteData,
  ReporteFiltros,
  ReporteFormatoExport,
  ReporteTipo,
  TendenciaMensual,
  Usuario,
  UsuarioListado,
  UsuarioTop,
} from '../../core/models';
import { ChartCard } from '../../shared/chart-card/chart-card';
import {
  buildBalanceAnualOptions,
  buildBalanceMensualOptions,
  buildCategoriasOptions,
  buildComparativaOptions,
  buildIngresosVsGastosOptions,
  buildMovimientosPorDiaOptions,
  buildTopUsuariosOptions,
} from '../../shared/chart-card/chart-builders';
import { AppPaginator } from '../../shared/app-paginator/app-paginator';
import { Notice } from '../../shared/notice/notice';
import { PanelCard } from '../../shared/panel-card/panel-card';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { StatCard, StatCardAccent } from '../../shared/stat-card/stat-card';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { EditUserDialog, EditUserDialogResult } from './dialogs/edit-user-dialog/edit-user-dialog';
import { EditMovimientoGlobalDialog } from './dialogs/edit-movimiento-global-dialog/edit-movimiento-global-dialog';
import { MovimientoDetailDialog } from './dialogs/movimiento-detail-dialog/movimiento-detail-dialog';
import { ResetPasswordDialog } from './dialogs/reset-password-dialog/reset-password-dialog';
import { UserHistoryDialog } from './dialogs/user-history-dialog/user-history-dialog';
import { UserStatsDialog } from './dialogs/user-stats-dialog/user-stats-dialog';

type AdminSection = 'balances' | 'movimientos';
type VistaAdmin = 'dashboard' | 'usuarios' | 'movimientos-global' | 'reportes';

interface KpiCardViewModel {
  label: string;
  value: string;
  icon: string;
  accent: StatCardAccent;
  variacion: number | null;
}

interface ColumnaReporte {
  key: string;
  label: string;
}

interface TarjetaResumenReporte {
  label: string;
  value: string;
}

const ETIQUETAS_RESUMEN_REPORTE: Record<string, string> = {
  anio: 'Año',
  anioDesde: 'Año desde',
  anioHasta: 'Año hasta',
  totalIngresos: 'Total ingresos',
  totalGastos: 'Total gastos',
  balanceNeto: 'Balance neto',
  fechaDesde: 'Desde',
  fechaHasta: 'Hasta',
  totalUsuarios: 'Usuarios',
  totalMovimientos: 'Movimientos',
  totalMonto: 'Monto total',
  totalCategorias: 'Categorias',
  usuarioId: 'Usuario ID',
  cantidadMovimientos: 'Cantidad de movimientos',
  balance: 'Balance',
  ingresosActual: 'Ingresos (actual)',
  ingresosAnterior: 'Ingresos (anterior)',
  gastosActual: 'Gastos (actual)',
  gastosAnterior: 'Gastos (anterior)',
  balanceActual: 'Balance (actual)',
  balanceAnterior: 'Balance (anterior)',
  variacionIngresos: 'Variacion ingresos',
  variacionGastos: 'Variacion gastos',
  variacionBalance: 'Variacion balance',
};

const CLAVES_RESUMEN_FECHA = ['fechaDesde', 'fechaHasta'];
const CLAVES_RESUMEN_PORCENTAJE = ['variacionIngresos', 'variacionGastos', 'variacionBalance'];
const CLAVES_RESUMEN_MONEDA = [
  'totalIngresos', 'totalGastos', 'balanceNeto', 'totalMonto', 'balance',
  'ingresosActual', 'ingresosAnterior', 'gastosActual', 'gastosAnterior', 'balanceActual', 'balanceAnterior',
];

const TIPOS_REPORTE: { value: ReporteTipo; label: string }[] = [
  { value: 'ingresos-mensuales', label: 'Ingresos mensuales' },
  { value: 'gastos-mensuales', label: 'Gastos mensuales' },
  { value: 'balance-anual', label: 'Balance anual' },
  { value: 'balance-mensual', label: 'Balance mensual' },
  { value: 'top-usuarios', label: 'Top usuarios' },
  { value: 'top-categorias', label: 'Top categorías' },
  { value: 'movimientos-usuario', label: 'Movimientos por usuario' },
  { value: 'movimientos-fecha', label: 'Movimientos por fecha' },
  { value: 'comparativas', label: 'Comparativas' },
];

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
    StatCard,
    PanelCard,
    Skeleton,
    ChartCard,
    Notice,
    AppPaginator,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly dashboardCache = inject(DashboardCacheService);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly monedas = CURRENCIES;
  readonly monedaInforme = signal('USD');
  readonly money = formatCurrency;
  readonly vistaActiva = signal<VistaAdmin>('dashboard');

  readonly usuarios = signal<UsuarioListado[]>([]);
  readonly movimientos = signal<Movimiento[]>([]);
  readonly balancesPorUsuario = signal<Record<number, BalanceUsuario>>({});
  readonly usuarioSeleccionado = signal<Usuario | null>(null);
  readonly movimientoEditando = signal<Movimiento | null>(null);
  readonly seccionActiva = signal<AdminSection>('balances');
  readonly cargandoUsuarios = signal(false);
  readonly cargandoMovimientos = signal(false);
  readonly error = signal('');

  readonly totalMovimientos = computed(() => this.movimientos().length);
  readonly balanceSeleccionado = computed(() => {
    const usuario = this.usuarioSeleccionado();
    return usuario ? this.balancesPorUsuario()[usuario.id] : null;
  });
  readonly cuentasSeleccionadas = computed(() => this.balanceSeleccionado()?.cuentas || []);
  readonly balanceTotalSeleccionado = computed(() => Number(this.balanceSeleccionado()?.balance_total || 0));

  // ==========================================
  // CRUD de Usuarios: paginación, orden y filtros
  // ==========================================

  readonly totalUsuarios = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly sortActive = signal('id');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly filtroRol = signal('');
  readonly filtroEstado = signal<'' | 'activo' | 'inactivo'>('');
  readonly filtroTexto = signal('');

  readonly displayedColumns = [
    'nombre',
    'correo',
    'estado',
    'created_at',
    'ultimo_login',
    'movimientos_count',
    'balance_total',
    'acciones',
  ];

  readonly filtrosForm = this.fb.nonNullable.group({
    texto: [''],
  });

  // ==========================================
  // Movimientos Global: paginación, orden y filtros
  // ==========================================

  readonly movimientosGlobal = signal<MovimientoGlobal[]>([]);
  readonly totalMovimientosGlobal = signal(0);
  readonly pageIndexMg = signal(0);
  readonly pageSizeMg = signal(20);
  readonly sortActiveMg = signal('fecha');
  readonly sortDirectionMg = signal<'asc' | 'desc'>('desc');
  readonly cargandoMovimientosGlobal = signal(false);
  private movimientosGlobalRequest = 0;

  readonly filtroUsuarioMg = signal<Usuario | null>(null);
  readonly filtroCategoriaMg = signal('');
  readonly filtroTipoMg = signal<'' | 'INGRESO' | 'GASTO' | 'TRANSFERENCIA'>('');
  readonly filtroEstadoMg = signal<'activo' | 'eliminado' | 'todos'>('activo');
  readonly filtroRangoFechaMg = signal<'' | 'hoy' | 'semana' | 'mes' | 'anio'>('');
  readonly filtroTextoMg = signal('');

  readonly categoriasDisponibles = signal<string[]>([]);
  readonly usuariosSugeridosMg = signal<Usuario[]>([]);

  readonly displayedColumnsMg = ['fecha', 'usuario', 'categoria', 'tipo', 'monto', 'descripcion', 'estado', 'acciones'];

  readonly filtrosMovimientosGlobalForm = this.fb.nonNullable.group({
    texto: [''],
    montoMin: [''],
    montoMax: [''],
    buscarUsuario: [''],
  });

  // ==========================================
  // Dashboard Administrativo (nuevo panel superior)
  // ==========================================

  readonly dashboardData = signal<DashboardAdminData | null>(null);
  readonly cargandoDashboard = signal(false);
  readonly errorDashboard = signal('');
  readonly horaActual = signal(new Date());

  readonly kpiCards = computed<KpiCardViewModel[]>(() => {
    const data = this.dashboardData();
    if (!data) return [];
    const kpis = data.kpis;

    return [
      { label: 'Balance Global', value: this.formatearMoneda(kpis.balanceGlobal.valor), icon: 'account_balance', accent: 'cyan', variacion: kpis.balanceGlobal.variacion },
      { label: 'Ingresos del Mes', value: this.formatearMoneda(kpis.ingresosMes.valor), icon: 'arrow_upward', accent: 'success', variacion: kpis.ingresosMes.variacion },
      { label: 'Gastos del Mes', value: this.formatearMoneda(kpis.gastosMes.valor), icon: 'arrow_downward', accent: 'danger', variacion: kpis.gastosMes.variacion },
      { label: 'Usuarios Registrados', value: this.formatearEntero(kpis.usuariosRegistrados.valor), icon: 'group', accent: 'blue', variacion: kpis.usuariosRegistrados.variacion },
      { label: 'Usuarios Activos', value: this.formatearEntero(kpis.usuariosActivos.valor), icon: 'how_to_reg', accent: 'teal', variacion: kpis.usuariosActivos.variacion },
      { label: 'Cantidad de Movimientos', value: this.formatearEntero(kpis.cantidadMovimientos.valor), icon: 'swap_horiz', accent: 'violet', variacion: kpis.cantidadMovimientos.variacion },
      { label: 'Balance Disponible', value: this.formatearMoneda(kpis.balanceDisponible.valor), icon: 'account_balance_wallet', accent: 'blue', variacion: kpis.balanceDisponible.variacion },
      { label: 'Variación Mensual', value: `${kpis.variacionMensual.valor >= 0 ? '+' : ''}${kpis.variacionMensual.valor}%`, icon: 'insights', accent: kpis.variacionMensual.valor >= 0 ? 'success' : 'danger', variacion: null },
    ];
  });

  readonly ultimosMovimientosGlobales = computed(() => this.dashboardData()?.actividadReciente.ultimosMovimientos ?? []);
  readonly ultimosUsuariosGlobales = computed(() => this.dashboardData()?.actividadReciente.ultimosUsuarios ?? []);
  readonly ultimosLoginsGlobales = computed(() => this.dashboardData()?.actividadReciente.ultimosLogins ?? []);

  readonly ingresosVsGastosOptions = computed(() => buildIngresosVsGastosOptions(this.dashboardData()?.charts.tendenciaMensual ?? []));
  readonly balanceMensualOptions = computed(() => buildBalanceMensualOptions(this.dashboardData()?.charts.tendenciaMensual ?? []));
  readonly movimientosPorDiaOptions = computed(() => buildMovimientosPorDiaOptions(this.dashboardData()?.charts.movimientosPorDia ?? []));
  readonly categoriasOptions = computed(() => buildCategoriasOptions(this.dashboardData()?.charts.categoriasMasUsadas ?? []));
  readonly topUsuariosOptions = computed(() => buildTopUsuariosOptions(this.dashboardData()?.charts.topUsuarios ?? []));

  // ==========================================
  // Módulo de Reportes
  // ==========================================

  readonly tiposReporte = TIPOS_REPORTE;

  readonly tipoReporteSeleccionado = signal<ReporteTipo>('ingresos-mensuales');
  readonly anioReporte = signal(new Date().getFullYear());
  readonly anioDesdeReporte = signal(new Date().getFullYear() - 2);
  readonly anioHastaReporte = signal(new Date().getFullYear());
  readonly fechaDesdeReporte = signal('');
  readonly fechaHastaReporte = signal('');
  readonly usuarioReporte = signal<Usuario | null>(null);
  readonly usuariosSugeridosReporte = signal<Usuario[]>([]);

  readonly reporteData = signal<ReporteData | null>(null);
  readonly cargandoReporte = signal(false);
  readonly errorReporte = signal('');

  readonly filtrosReporteForm = this.fb.nonNullable.group({
    buscarUsuario: [''],
  });

  readonly requiereAnio = computed(() =>
    ['ingresos-mensuales', 'gastos-mensuales', 'balance-mensual'].includes(this.tipoReporteSeleccionado()),
  );
  readonly requiereRangoAnios = computed(() => this.tipoReporteSeleccionado() === 'balance-anual');
  readonly requiereRangoFechas = computed(() =>
    ['top-usuarios', 'top-categorias', 'movimientos-fecha', 'comparativas'].includes(this.tipoReporteSeleccionado()),
  );
  readonly requiereUsuario = computed(() => this.tipoReporteSeleccionado() === 'movimientos-usuario');

  readonly resumenReporteCards = computed<TarjetaResumenReporte[]>(() => {
    const resumen = this.reporteData()?.resumen ?? {};
    return Object.entries(resumen)
      .filter(([, valor]) => valor !== null && valor !== undefined)
      .map(([clave, valor]) => {
        let valorFormateado: string;
        if (CLAVES_RESUMEN_FECHA.includes(clave)) valorFormateado = formatReportDate(String(valor));
        else if (CLAVES_RESUMEN_PORCENTAJE.includes(clave)) valorFormateado = `${valor}%`;
        else if (CLAVES_RESUMEN_MONEDA.includes(clave)) valorFormateado = formatCurrency(Number(valor), this.reporteData()?.moneda || this.monedaInforme());
        else if (typeof valor === 'number') valorFormateado = this.formatearEntero(valor);
        else valorFormateado = String(valor);
        return { label: ETIQUETAS_RESUMEN_REPORTE[clave] || clave, value: valorFormateado };
      });
  });

  readonly columnasTablaReporte = computed<ColumnaReporte[]>(() => {
    switch (this.tipoReporteSeleccionado()) {
      case 'ingresos-mensuales':
      case 'gastos-mensuales':
      case 'balance-mensual':
        return [
          { key: 'mesLabel', label: 'Mes' },
          { key: 'ingresos', label: 'Ingresos' },
          { key: 'gastos', label: 'Gastos' },
          { key: 'balance', label: 'Balance' },
        ];
      case 'balance-anual':
        return [
          { key: 'anio', label: 'Año' },
          { key: 'ingresos', label: 'Ingresos' },
          { key: 'gastos', label: 'Gastos' },
          { key: 'balance', label: 'Balance' },
        ];
      case 'top-usuarios':
        return [
          { key: 'nombre', label: 'Usuario' },
          { key: 'correo', label: 'Correo' },
          { key: 'cantidad_movimientos', label: 'Movimientos' },
          { key: 'monto_total', label: 'Monto total' },
        ];
      case 'top-categorias':
        return [
          { key: 'categoria', label: 'Categoria' },
          { key: 'cantidad', label: 'Cantidad' },
          { key: 'monto_total', label: 'Monto total' },
        ];
      case 'movimientos-usuario':
      case 'movimientos-fecha':
        return [
          { key: 'fechaLabel', label: 'Fecha' },
          { key: 'usuario_nombre', label: 'Usuario' },
          { key: 'categoria', label: 'Categoria' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'monto', label: 'Monto' },
          { key: 'descripcion', label: 'Descripcion' },
          { key: 'estado', label: 'Estado' },
        ];
      case 'comparativas':
        return [
          { key: 'periodo', label: 'Periodo' },
          { key: 'ingresos', label: 'Ingresos' },
          { key: 'gastos', label: 'Gastos' },
          { key: 'balance', label: 'Balance' },
          { key: 'cantidadMovimientos', label: 'Movimientos' },
        ];
      default:
        return [];
    }
  });

  readonly columnasTablaReporteKeys = computed(() => this.columnasTablaReporte().map((c) => c.key));

  readonly filasTablaReporte = computed<Record<string, unknown>[]>(() => {
    const datos = (this.reporteData()?.datos ?? []) as Record<string, unknown>[];
    const tipo = this.tipoReporteSeleccionado();
    const CLAVES_MONEDA_FILA = ['ingresos', 'gastos', 'balance', 'monto_total', 'monto'];

    const formatearFila = (fila: Record<string, unknown>): Record<string, unknown> => {
      const resultado = { ...fila };
      CLAVES_MONEDA_FILA.forEach((clave) => {
        if (resultado[clave] !== undefined && resultado[clave] !== null) {
          resultado[clave] = formatCurrency(Number(resultado[clave]), String(resultado['moneda'] || this.reporteData()?.moneda || this.monedaInforme()));
        }
      });
      return resultado;
    };

    if (tipo === 'ingresos-mensuales' || tipo === 'gastos-mensuales' || tipo === 'balance-mensual') {
      return datos.map((d) => {
        const ingresos = Number(d['ingresos']);
        const gastos = Number(d['gastos']);
        return formatearFila({ ...d, mesLabel: this.formatMesCorto(String(d['mes'])), ingresos, gastos, balance: ingresos - gastos });
      });
    }
    if (tipo === 'movimientos-usuario' || tipo === 'movimientos-fecha') {
      return datos.map((m) =>
        formatearFila({ ...m, fechaLabel: this.formatFechaCorta(String(m['fecha'])), estado: m['deleted_at'] ? 'Eliminado' : 'Activo' }),
      );
    }
    return datos.map((d) => formatearFila(d));
  });

  readonly chartOptionsReporte = computed(() => {
    const data = this.reporteData();
    if (!data) return null;

    switch (this.tipoReporteSeleccionado()) {
      case 'ingresos-mensuales':
      case 'gastos-mensuales':
        return buildIngresosVsGastosOptions(data.datos as TendenciaMensual[]);
      case 'balance-mensual':
        return buildBalanceMensualOptions(data.datos as TendenciaMensual[]);
      case 'balance-anual':
        return buildBalanceAnualOptions(data.datos as BalanceAnual[]);
      case 'top-usuarios':
        return buildTopUsuariosOptions(data.datos as UsuarioTop[]);
      case 'top-categorias':
        return buildCategoriasOptions(data.datos as CategoriaUsada[]);
      case 'movimientos-usuario':
      case 'movimientos-fecha':
        return buildMovimientosPorDiaOptions((data.chartDatos ?? []) as MovimientoPorDia[]);
      case 'comparativas':
        return buildComparativaOptions(data.datos as ComparativaPeriodo[]);
      default:
        return null;
    }
  });

  readonly movimientoForm = this.fb.nonNullable.group({
    categoria: [''],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    cuenta_origen: [''],
    cuenta_destino: [''],
    descripcion: [''],
    // Sin campo visible: se conserva el valor guardado para que editar no lo sobrescriba.
    metodo_pago: [''],
  });

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarDashboard();
    this.iniciarReloj();

    this.filtrosForm.controls.texto.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        this.filtroTexto.set(texto.trim());
        this.pageIndex.set(0);
        this.cargarUsuarios();
      });

    // Reacciona a ?vista=... en cada navegación (no solo al montar el componente),
    // para que el link del sidebar funcione aunque ya estemos en /admin.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const parametroVista = params.get('vista');
      let vista: VistaAdmin = 'dashboard';
      if (parametroVista === 'usuarios') vista = 'usuarios';
      else if (parametroVista === 'movimientos') vista = 'movimientos-global';
      else if (parametroVista === 'reportes') vista = 'reportes';

      this.vistaActiva.set(vista);

      if (vista === 'movimientos-global') {
        if (this.categoriasDisponibles().length === 0) this.cargarCategoriasDisponibles();
        this.cargarMovimientosGlobal();
      } else if (vista === 'reportes') {
        this.cargarReporte();
      }
    });

    this.filtrosMovimientosGlobalForm.controls.texto.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        this.filtroTextoMg.set(texto.trim());
        this.pageIndexMg.set(0);
        this.cargarMovimientosGlobal();
      });

    this.filtrosMovimientosGlobalForm.controls.montoMin.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndexMg.set(0);
        this.cargarMovimientosGlobal();
      });

    this.filtrosMovimientosGlobalForm.controls.montoMax.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndexMg.set(0);
        this.cargarMovimientosGlobal();
      });

    this.filtrosMovimientosGlobalForm.controls.buscarUsuario.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (!texto || texto.length < 2) {
          this.usuariosSugeridosMg.set([]);
          return;
        }
        this.api.buscarUsuariosPorCorreo(texto).subscribe((usuarios) => this.usuariosSugeridosMg.set(usuarios));
      });

    this.filtrosReporteForm.controls.buscarUsuario.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (!texto || texto.length < 2) {
          this.usuariosSugeridosReporte.set([]);
          return;
        }
        this.api.buscarUsuariosPorCorreo(texto).subscribe((usuarios) => this.usuariosSugeridosReporte.set(usuarios));
      });
  }

  cambiarMonedaInforme(code: string): void {
    this.monedaInforme.set(currencyCode(code));
    this.cargarDashboard();
    this.cargarReporte();
    this.pageIndexMg.set(0);
    this.cargarMovimientosGlobal();
  }

  cerrarSesion(): void {
    this.auth.logout();
  }

  cargarDashboard(): void {
    this.cargandoDashboard.set(true);
    this.errorDashboard.set('');

    const moneda = this.monedaInforme();
    this.dashboardData.set(null);
    this.dashboardCache.obtenerDashboardAdmin(moneda).subscribe({
      next: (data) => {
        if(moneda!==this.monedaInforme())return;
        this.dashboardData.set(data);
        this.cargandoDashboard.set(false);
      },
      error: (err) => {
        this.cargandoDashboard.set(false);
        this.errorDashboard.set(err?.error?.message || 'No se pudo cargar el dashboard.');
      },
    });
  }

  private iniciarReloj(): void {
    const id = setInterval(() => this.horaActual.set(new Date()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }

  private formatearMoneda(valor: number): string {
    return formatCurrency(valor, this.dashboardData()?.moneda || this.monedaInforme());
  }

  private formatearEntero(valor: number): string {
    return valor.toLocaleString('es-ES');
  }

  cargarUsuarios(): void {
    this.cargandoUsuarios.set(true);
    this.error.set('');

    this.api
      .listarUsuarios({
        page: this.pageIndex() + 1,
        limit: this.pageSize(),
        sortBy: this.sortActive(),
        sortDir: this.sortDirection(),
        rol: this.filtroRol() || undefined,
        estado: this.filtroEstado() || undefined,
        q: this.filtroTexto() || undefined,
      })
      .subscribe({
        next: ({ data, meta }) => {
          this.usuarios.set(data);
          this.totalUsuarios.set(meta.total);
          this.cargandoUsuarios.set(false);
        },
        error: (err) => {
          this.cargandoUsuarios.set(false);
          this.error.set(err?.error?.message || 'No se pudieron cargar los usuarios.');
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.cargarUsuarios();
  }

  onSortChange(sort: Sort): void {
    this.sortActive.set(sort.direction ? sort.active : 'id');
    this.sortDirection.set(sort.direction === 'desc' ? 'desc' : 'asc');
    this.pageIndex.set(0);
    this.cargarUsuarios();
  }

  onFiltroRolChange(rol: string): void {
    this.filtroRol.set(rol);
    this.pageIndex.set(0);
    this.cargarUsuarios();
  }

  onFiltroEstadoChange(estado: '' | 'activo' | 'inactivo'): void {
    this.filtroEstado.set(estado);
    this.pageIndex.set(0);
    this.cargarUsuarios();
  }

  cambiarVista(vista: VistaAdmin): void {
    const parametroVista = vista === 'movimientos-global' ? 'movimientos' : vista;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vista: parametroVista },
      queryParamsHandling: 'merge',
    });
  }

  cargarCategoriasDisponibles(): void {
    this.dashboardCache.listarCategoriasGlobal().subscribe({
      next: (categorias) => this.categoriasDisponibles.set(categorias),
      error: (err) => this.error.set(err?.error?.message || 'No se pudieron cargar las categorías.'),
    });
  }

  cargarMovimientosGlobal(): void {
    const request = ++this.movimientosGlobalRequest;
    const moneda = this.monedaInforme();
    this.cargandoMovimientosGlobal.set(true);
    this.movimientosGlobal.set([]);
    this.totalMovimientosGlobal.set(0);
    const params: ListarMovimientosGlobalesParams = {
      moneda,
      page: this.pageIndexMg() + 1,
      limit: this.pageSizeMg(),
      sortBy: this.sortActiveMg() as ListarMovimientosGlobalesParams['sortBy'],
      sortDir: this.sortDirectionMg(),
      usuarioId: this.filtroUsuarioMg()?.id,
      categoria: this.filtroCategoriaMg() || undefined,
      tipo: this.filtroTipoMg() || undefined,
      montoMin: this.filtrosMovimientosGlobalForm.controls.montoMin.value
        ? Number(this.filtrosMovimientosGlobalForm.controls.montoMin.value)
        : undefined,
      montoMax: this.filtrosMovimientosGlobalForm.controls.montoMax.value
        ? Number(this.filtrosMovimientosGlobalForm.controls.montoMax.value)
        : undefined,
      estado: this.filtroEstadoMg(),
      rangoFecha: this.filtroRangoFechaMg() || undefined,
      q: this.filtroTextoMg() || undefined,
    };

    this.api.listarMovimientosGlobal(params).subscribe({
      next: ({ data, meta }) => {
        if (request !== this.movimientosGlobalRequest || moneda !== this.monedaInforme()) return;
        this.movimientosGlobal.set(data);
        this.totalMovimientosGlobal.set(meta.total);
        this.cargandoMovimientosGlobal.set(false);
      },
      error: (err) => {
        if (request !== this.movimientosGlobalRequest || moneda !== this.monedaInforme()) return;
        this.cargandoMovimientosGlobal.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cargar los movimientos.');
      },
    });
  }

  onPageChangeMg(event: PageEvent): void {
    this.pageIndexMg.set(event.pageIndex);
    this.pageSizeMg.set(event.pageSize);
    this.cargarMovimientosGlobal();
  }

  onSortChangeMg(sort: Sort): void {
    this.sortActiveMg.set(sort.direction ? sort.active : 'fecha');
    this.sortDirectionMg.set(sort.direction === 'asc' ? 'asc' : 'desc');
    this.pageIndexMg.set(0);
    this.cargarMovimientosGlobal();
  }

  onFiltroCategoriaChangeMg(categoria: string): void {
    this.filtroCategoriaMg.set(categoria);
    this.pageIndexMg.set(0);
    this.cargarMovimientosGlobal();
  }

  onFiltroTipoChangeMg(tipo: '' | 'INGRESO' | 'GASTO' | 'TRANSFERENCIA'): void {
    this.filtroTipoMg.set(tipo);
    this.pageIndexMg.set(0);
    this.cargarMovimientosGlobal();
  }

  onFiltroEstadoChangeMg(estado: 'activo' | 'eliminado' | 'todos'): void {
    this.filtroEstadoMg.set(estado);
    this.pageIndexMg.set(0);
    this.cargarMovimientosGlobal();
  }

  onFiltroRangoFechaChangeMg(rango: '' | 'hoy' | 'semana' | 'mes' | 'anio'): void {
    this.filtroRangoFechaMg.set(rango);
    this.pageIndexMg.set(0);
    this.cargarMovimientosGlobal();
  }

  seleccionarUsuarioFiltroMg(usuario: Usuario): void {
    this.filtroUsuarioMg.set(usuario);
    this.filtrosMovimientosGlobalForm.controls.buscarUsuario.setValue(usuario.correo, { emitEvent: false });
    this.usuariosSugeridosMg.set([]);
    this.pageIndexMg.set(0);
    this.cargarMovimientosGlobal();
  }

  limpiarFiltroUsuarioMg(): void {
    this.filtroUsuarioMg.set(null);
    this.filtrosMovimientosGlobalForm.controls.buscarUsuario.setValue('', { emitEvent: false });
    this.pageIndexMg.set(0);
    this.cargarMovimientosGlobal();
  }

  abrirVerDetalleMovimiento(mov: MovimientoGlobal): void {
    this.dialog.open(MovimientoDetailDialog, { data: { movimiento: mov }, width: '520px' });
  }

  abrirEditarMovimientoGlobal(mov: MovimientoGlobal): void {
    this.dialog
      .open(EditMovimientoGlobalDialog, { data: { movimiento: mov }, width: '480px' })
      .afterClosed()
      .subscribe((result: MovimientoPayload | undefined) => {
        if (!result) return;
        this.api.actualizarMovimiento(mov.usuario_id, mov.id, result).subscribe({
          next: () => {
            this.snackbar.exito('Movimiento actualizado.');
            this.cargarMovimientosGlobal();
          },
          error: (err) => this.snackbar.error(err?.error?.message || 'No se pudo actualizar el movimiento.'),
        });
      });
  }

  duplicarMovimientoGlobal(mov: MovimientoGlobal): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Duplicar movimiento',
          mensaje: `¿Duplicar el movimiento #${mov.id}? Se creará un nuevo movimiento con fecha actual y se ajustará el saldo correspondiente.`,
          tono: 'primary',
        },
        width: '440px',
      })
      .afterClosed()
      .subscribe((confirmado: boolean | undefined) => {
        if (!confirmado) return;
        this.api.duplicarMovimientoGlobal(mov.id).subscribe({
          next: () => {
            this.snackbar.exito('Movimiento duplicado correctamente.');
            this.cargarMovimientosGlobal();
          },
          error: (err) => this.snackbar.error(err?.error?.message || 'No se pudo duplicar el movimiento.'),
        });
      });
  }

  eliminarMovimientoGlobal(mov: MovimientoGlobal): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Eliminar movimiento',
          mensaje: `¿Eliminar el movimiento #${mov.id} de ${mov.usuario_nombre || mov.usuario_correo}?`,
          tono: 'warn',
        },
        width: '440px',
      })
      .afterClosed()
      .subscribe((confirmado: boolean | undefined) => {
        if (!confirmado) return;
        this.api.eliminarMovimiento(mov.usuario_id, mov.id).subscribe({
          next: () => {
            this.snackbar.exito('Movimiento eliminado.');
            this.cargarMovimientosGlobal();
          },
          error: (err) => this.snackbar.error(err?.error?.message || 'No se pudo eliminar el movimiento.'),
        });
      });
  }

  exportarMovimientosGlobal(): void {
    const moneda = this.monedaInforme();
    const params: ListarMovimientosGlobalesParams = {
      moneda,
      sortBy: this.sortActiveMg() as ListarMovimientosGlobalesParams['sortBy'],
      sortDir: this.sortDirectionMg(),
      usuarioId: this.filtroUsuarioMg()?.id,
      categoria: this.filtroCategoriaMg() || undefined,
      tipo: this.filtroTipoMg() || undefined,
      montoMin: this.filtrosMovimientosGlobalForm.controls.montoMin.value
        ? Number(this.filtrosMovimientosGlobalForm.controls.montoMin.value)
        : undefined,
      montoMax: this.filtrosMovimientosGlobalForm.controls.montoMax.value
        ? Number(this.filtrosMovimientosGlobalForm.controls.montoMax.value)
        : undefined,
      estado: this.filtroEstadoMg(),
      rangoFecha: this.filtroRangoFechaMg() || undefined,
      q: this.filtroTextoMg() || undefined,
    };

    this.api.exportarMovimientosGlobal(params).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `movimientos-${moneda}.csv`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackbar.error('No se pudo exportar el archivo CSV.'),
    });
  }

  // ==========================================
  // Módulo de Reportes
  // ==========================================

  private construirFiltrosReporte(): ReporteFiltros {
    return {
      moneda: this.monedaInforme(),
      anio: this.requiereAnio() ? this.anioReporte() : undefined,
      anioDesde: this.requiereRangoAnios() ? this.anioDesdeReporte() : undefined,
      anioHasta: this.requiereRangoAnios() ? this.anioHastaReporte() : undefined,
      fechaDesde: this.requiereRangoFechas() && this.fechaDesdeReporte() ? this.fechaDesdeReporte() : undefined,
      fechaHasta: this.requiereRangoFechas() && this.fechaHastaReporte() ? this.fechaHastaReporte() : undefined,
      usuarioId: this.requiereUsuario() ? (this.usuarioReporte()?.id ?? undefined) : undefined,
    };
  }

  private formatMesCorto(fechaIso: string): string {
    return formatCalendarMonth(fechaIso);
  }

  private formatFechaCorta(fechaIso: string): string {
    return formatReportDate(fechaIso, { day: '2-digit', month: 'short', year: '2-digit' });
  }

  cargarReporte(): void {
    this.cargandoReporte.set(true);
    this.errorReporte.set('');

    const moneda = this.monedaInforme();
    this.reporteData.set(null);
    this.api.generarReporte(this.tipoReporteSeleccionado(), this.construirFiltrosReporte()).subscribe({
      next: (data) => {
        if(moneda!==this.monedaInforme())return;
        this.reporteData.set(data);
        this.cargandoReporte.set(false);
      },
      error: (err) => {
        this.cargandoReporte.set(false);
        this.errorReporte.set(err?.error?.message || 'No se pudo generar el reporte.');
      },
    });
  }

  onTipoReporteChange(tipo: ReporteTipo): void {
    this.tipoReporteSeleccionado.set(tipo);
    this.cargarReporte();
  }

  onAnioReporteChange(anio: number): void {
    this.anioReporte.set(Number(anio) || new Date().getFullYear());
    this.cargarReporte();
  }

  onAnioDesdeReporteChange(anio: number): void {
    this.anioDesdeReporte.set(Number(anio) || this.anioDesdeReporte());
    this.cargarReporte();
  }

  onAnioHastaReporteChange(anio: number): void {
    this.anioHastaReporte.set(Number(anio) || this.anioHastaReporte());
    this.cargarReporte();
  }

  onFechaDesdeReporteChange(fecha: string): void {
    this.fechaDesdeReporte.set(fecha);
    this.cargarReporte();
  }

  onFechaHastaReporteChange(fecha: string): void {
    this.fechaHastaReporte.set(fecha);
    this.cargarReporte();
  }

  seleccionarUsuarioReporte(usuario: Usuario): void {
    this.usuarioReporte.set(usuario);
    this.filtrosReporteForm.controls.buscarUsuario.setValue(usuario.correo, { emitEvent: false });
    this.usuariosSugeridosReporte.set([]);
    this.cargarReporte();
  }

  limpiarUsuarioReporte(): void {
    this.usuarioReporte.set(null);
    this.filtrosReporteForm.controls.buscarUsuario.setValue('', { emitEvent: false });
    this.cargarReporte();
  }

  exportarReporteActual(formato: ReporteFormatoExport): void {
    const tipo = this.tipoReporteSeleccionado();
    const extension = formato === 'excel' ? 'xlsx' : formato;

    this.api.exportarReporte(tipo, formato, this.construirFiltrosReporte()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `reporte-${tipo}.${extension}`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackbar.error('No se pudo exportar el reporte.'),
    });
  }

  seleccionarUsuario(usuario: UsuarioListado): void {
    this.usuarioSeleccionado.set(usuario);
    this.movimientoEditando.set(null);
    this.cargarBalanceUsuario(usuario.id);
    this.cargarMovimientos(usuario.id);
  }

  cambiarSeccion(seccion: AdminSection): void {
    this.seccionActiva.set(seccion);
  }

  abrirEditarUsuario(usuario: UsuarioListado): void {
    this.dialog
      .open(EditUserDialog, { data: { usuario }, width: '480px' })
      .afterClosed()
      .subscribe((result: EditUserDialogResult | undefined) => {
        if (!result) return;
        this.api.actualizarUsuario(usuario.id, result).subscribe({
          next: () => {
            this.snackbar.exito('Usuario actualizado.');
            this.cargarUsuarios();
          },
          error: (err) => this.snackbar.error(err?.error?.message || 'No se pudo actualizar el usuario.'),
        });
      });
  }

  abrirRestablecerPassword(usuario: UsuarioListado): void {
    this.dialog
      .open(ResetPasswordDialog, { data: { usuario }, width: '420px' })
      .afterClosed()
      .subscribe((password: string | undefined) => {
        if (!password) return;
        this.api.restablecerPassword(usuario.id, password).subscribe({
          next: () => this.snackbar.exito('Contraseña restablecida.'),
          error: (err) => this.snackbar.error(err?.error?.message || 'No se pudo restablecer la contraseña.'),
        });
      });
  }

  abrirVerEstadisticas(usuario: UsuarioListado): void {
    this.dialog.open(UserStatsDialog, { data: { usuario }, width: '640px' });
  }

  abrirVerHistorial(usuario: UsuarioListado): void {
    this.dialog.open(UserHistoryDialog, { data: { usuario }, width: '420px' });
  }

  verMovimientosUsuario(usuario: UsuarioListado): void {
    this.seleccionarUsuario(usuario);
    this.cambiarSeccion('movimientos');
  }

  toggleEstadoUsuario(usuario: UsuarioListado): void {
    const activar = this.usuarioDeshabilitado(usuario);
    const data: ConfirmDialogData = activar
      ? { titulo: 'Activar usuario', mensaje: `¿Reactivar a ${usuario.correo}?`, tono: 'primary' }
      : { titulo: 'Desactivar usuario', mensaje: `¿Desactivar (bloquear) a ${usuario.correo}?`, tono: 'warn' };

    this.dialog
      .open(ConfirmDialog, { data, width: '420px' })
      .afterClosed()
      .subscribe((confirmado: boolean | undefined) => {
        if (!confirmado) return;

        const alTerminar = {
          next: () => {
            this.snackbar.exito(activar ? 'Usuario activado.' : 'Usuario desactivado.');
            this.cargarUsuarios();
          },
          error: (err: { error?: { message?: string } }) =>
            this.snackbar.error(err?.error?.message || 'No se pudo actualizar el estado del usuario.'),
        };

        if (activar) {
          this.api.reactivarUsuario(usuario.id).subscribe(alTerminar);
        } else {
          this.api.deshabilitarUsuario(usuario.id).subscribe(alTerminar);
        }
      });
  }

  eliminarUsuario(usuario: UsuarioListado): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Eliminar usuario',
          mensaje: `¿Eliminar a ${usuario.correo}? Esta acción lo marcará como inactivo.`,
          tono: 'warn',
        },
        width: '420px',
      })
      .afterClosed()
      .subscribe((confirmado: boolean | undefined) => {
        if (!confirmado) return;
        this.api.deshabilitarUsuario(usuario.id).subscribe({
          next: () => {
            this.snackbar.exito('Usuario eliminado.');
            if (this.usuarioSeleccionado()?.id === usuario.id) {
              this.usuarioSeleccionado.set(null);
              this.movimientos.set([]);
            }
            this.cargarUsuarios();
          },
          error: (err) => this.snackbar.error(err?.error?.message || 'No se pudo eliminar el usuario.'),
        });
      });
  }

  cargarMovimientos(usuarioId: number): void {
    this.cargandoMovimientos.set(true);
    this.api.listarMovimientosUsuario(usuarioId).subscribe({
      next: (movimientos) => {
        this.movimientos.set(movimientos);
        this.cargandoMovimientos.set(false);
      },
      error: (err) => {
        this.cargandoMovimientos.set(false);
        this.error.set(err?.error?.message || 'No se pudieron cargar los movimientos.');
      },
    });
  }

  cargarBalanceUsuario(usuarioId: number): void {
    this.api.obtenerCuentasUsuario(usuarioId).subscribe({
      next: (balance) => {
        this.balancesPorUsuario.update((balances) => ({
          ...balances,
          [usuarioId]: balance,
        }));
      },
      error: (err) => this.error.set(err?.error?.message || 'No se pudieron cargar las cuentas del usuario.'),
    });
  }

  editarMovimiento(movimiento: Movimiento): void {
    this.movimientoEditando.set(movimiento);
    this.movimientoForm.reset({
      categoria: movimiento.categoria || '',
      monto: Number(movimiento.monto || 0),
      cuenta_origen: movimiento.cuenta_origen || '',
      cuenta_destino: movimiento.cuenta_destino || '',
      descripcion: movimiento.descripcion || '',
      metodo_pago: movimiento.metodo_pago || '',
    });
  }

  guardarMovimiento(): void {
    const usuario = this.usuarioSeleccionado();
    const movimiento = this.movimientoEditando();

    if (!usuario || !movimiento || this.movimientoForm.invalid) {
      this.movimientoForm.markAllAsTouched();
      return;
    }

    this.api.actualizarMovimiento(usuario.id, movimiento.id, this.movimientoForm.getRawValue()).subscribe({
      next: () => {
        this.snackbar.exito('Movimiento actualizado.');
        this.movimientoEditando.set(null);
        this.cargarMovimientos(usuario.id);
        this.cargarBalanceUsuario(usuario.id);
      },
      error: (err) => this.snackbar.error(err?.error?.message || 'No se pudo actualizar el movimiento.'),
    });
  }

  eliminarMovimiento(movimiento: Movimiento): void {
    const usuario = this.usuarioSeleccionado();
    if (!usuario || !confirm(`Eliminar el movimiento #${movimiento.id}?`)) return;

    this.api.eliminarMovimiento(usuario.id, movimiento.id).subscribe({
      next: () => {
        this.snackbar.exito('Movimiento eliminado.');
        this.movimientos.update((movimientos) => movimientos.filter((item) => item.id !== movimiento.id));
        this.cargarBalanceUsuario(usuario.id);
      },
      error: (err) => this.snackbar.error(err?.error?.message || 'No se pudo eliminar el movimiento.'),
    });
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

  usuarioDeshabilitado(usuario: Usuario): boolean {
    return Boolean(usuario.deleted_at);
  }
}
