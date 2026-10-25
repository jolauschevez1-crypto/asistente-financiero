export type RolUsuario = 'ADMIN' | 'ADMINISTRADOR' | 'USER' | 'USUARIO' | string;

export interface Usuario {
  id: number;
  moneda?: string;
  nombre: string | null;
  correo: string;
  rol: RolUsuario;
  telegram_id?: number | null;
  created_at?: string;
  ultimo_login?: string | null;
  deleted_at?: string | null;
  foto_url?: string | null;
}

export interface UsuarioPerfil {
  id: number;
  moneda?: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  tieneGoogle: boolean;
  tienePassword: boolean;
  telegram_id?: number | string | null;
  telegramId?: number | string | null;
  createdAt?: string;
  fotoUrl?: string | null;
  ultimoLogin?: string | null;
}

export interface UsuarioListado extends Usuario {
  movimientos_count: number | string;
  balance_total: number | string;
}

export interface Movimiento {
  moneda?: string;
  monto_destino?: number | string | null;
  moneda_destino?: string | null;
  tasa?: string | null;
  tasa_fecha?: string | null;
  id: number;
  tipo?: string;
  tipo_movimiento?: string;
  categoria?: string | null;
  monto: number | string;
  cuenta_origen?: string | null;
  cuenta_destino?: string | null;
  descripcion?: string | null;
  metodo_pago?: string | null;
  fecha?: string;
}

export interface Cuenta {
  id?: number;
  nombre: string;
  moneda?: string;
  saldo_actual: number | string;
}

export interface BalanceUsuario {
  moneda?: string;
  balance_total: number | string;
  balanceTotal?: number | string | null;
  /** Un total por moneda: los saldos de monedas distintas nunca se suman. */
  balances?: { moneda: string; total: number | string }[];
  balances_por_moneda?: { moneda: string; total: number | string }[];
  cuentas: Cuenta[];
}

export interface LoginResponse {
  message: string;
  token: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface RefreshResponse {
  message: string;
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MovimientoPayload {
  categoria?: string | null;
  monto: number;
  cuenta_origen?: string | null;
  cuenta_destino?: string | null;
  descripcion?: string | null;
  metodo_pago?: string | null;
}

export interface CrearMovimientoPayload extends MovimientoPayload {
  tipo: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA';
}

// ==========================================
// Dashboard Administrativo
// ==========================================

export interface KpiValor {
  valor: number;
  variacion: number | null;
}

export interface DashboardKpis {
  balanceGlobal: KpiValor;
  balanceDisponible: KpiValor;
  ingresosMes: KpiValor;
  gastosMes: KpiValor;
  usuariosRegistrados: KpiValor;
  usuariosActivos: KpiValor;
  cantidadMovimientos: KpiValor;
  variacionMensual: KpiValor;
}

export interface MovimientoReciente {
  moneda?: string;
  id: number;
  monto: number | string;
  fecha: string;
  descripcion: string | null;
  tipo: string;
  categoria: string | null;
  cuenta_origen: string | null;
  cuenta_destino: string | null;
  usuario_id: number;
  usuario_nombre: string | null;
  usuario_correo: string | null;
}

export interface UsuarioReciente {
  id: number;
  nombre: string | null;
  correo: string | null;
  rol: RolUsuario;
  created_at: string;
  deleted_at: string | null;
}

export interface LoginReciente {
  id: number;
  nombre: string | null;
  correo: string;
  ultimo_login: string;
}

export interface TendenciaMensual {
  mes: string;
  ingresos: number | string;
  gastos: number | string;
}

export interface MovimientoPorDia {
  dia: string;
  cantidad: number | string;
  monto_total: number | string;
}

export interface CategoriaUsada {
  categoria: string;
  cantidad: number | string;
  monto_total: number | string;
}

export interface UsuarioTop {
  id: number;
  nombre: string | null;
  correo: string;
  cantidad_movimientos: number | string;
  monto_total: number | string;
}

export interface DashboardAdminData {
  moneda?: string;
  kpis: DashboardKpis;
  actividadReciente: {
    ultimosMovimientos: MovimientoReciente[];
    ultimosUsuarios: UsuarioReciente[];
    ultimosLogins: LoginReciente[];
  };
  charts: {
    tendenciaMensual: TendenciaMensual[];
    movimientosPorDia: MovimientoPorDia[];
    categoriasMasUsadas: CategoriaUsada[];
    topUsuarios: UsuarioTop[];
  };
  servidor: { estado: 'UP' | 'DOWN'; uptimeSegundos: number; timestamp: string };
  baseDatos: { estado: 'UP' | 'DOWN' };
}

// ==========================================
// CRUD de Usuarios (listado paginado + estadísticas)
// ==========================================

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ListarUsuariosParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  rol?: string;
  estado?: 'activo' | 'inactivo';
  q?: string;
}

export interface ResumenMesMovimiento {
  id: number;
  tipo: string;
  categoria: string | null;
  monto: number | string;
  descripcion: string | null;
  fecha: string;
}

export interface GastoCategoriaMes {
  categoria: string;
  total: number | string;
}

export interface EstadisticasUsuario {
  moneda?: string;
  balanceTotal: number;
  balancesPorMoneda?: { moneda: string; total: number | string }[];
  resumenMes: ResumenMesMovimiento[];
  gastosCategoriaMes: GastoCategoriaMes[];
}

// ==========================================
// Módulo global de Movimientos (administración)
// ==========================================

export interface MovimientoGlobal {
  moneda?: string;
  id: number;
  fecha: string;
  monto: number | string;
  descripcion: string | null;
  metodo_pago: string | null;
  deleted_at: string | null;
  tipo: string;
  categoria: string | null;
  cuenta_origen: string | null;
  cuenta_destino: string | null;
  usuario_id: number;
  usuario_nombre: string | null;
  usuario_correo: string | null;
}

export type RangoFechaMovimiento = '' | 'hoy' | 'semana' | 'mes' | 'anio';
export type EstadoMovimientoFiltro = 'activo' | 'eliminado' | 'todos';

export interface ListarMovimientosGlobalesParams {
  moneda?: string;
  page?: number;
  limit?: number;
  sortBy?: 'fecha' | 'monto' | 'usuario' | 'categoria' | 'tipo';
  sortDir?: 'asc' | 'desc';
  usuarioId?: number;
  categoria?: string;
  tipo?: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA' | '';
  montoMin?: number;
  montoMax?: number;
  estado?: EstadoMovimientoFiltro;
  rangoFecha?: RangoFechaMovimiento;
  q?: string;
}

// ==========================================
// Módulo de Reportes (administración)
// ==========================================

export type ReporteTipo =
  | 'ingresos-mensuales'
  | 'gastos-mensuales'
  | 'balance-anual'
  | 'balance-mensual'
  | 'top-usuarios'
  | 'top-categorias'
  | 'movimientos-usuario'
  | 'movimientos-fecha'
  | 'comparativas';

export type ReporteFormatoExport = 'csv' | 'excel' | 'pdf';

export interface ReporteFiltros {
  moneda?: string;
  anio?: number;
  anioDesde?: number;
  anioHasta?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  usuarioId?: number;
  limite?: number;
  preset?: 'mes-actual' | 'mes-anterior' | 'anio-actual' | 'anio-anterior';
}

export interface BalanceAnual {
  anio: number;
  ingresos: number;
  gastos: number;
  balance: number;
}

export interface ComparativaPeriodo {
  periodo: string;
  ingresos: number;
  gastos: number;
  balance: number;
  cantidadMovimientos: number;
}

export interface ReporteData {
  moneda?: string;
  resumen: Record<string, number | string | null>;
  datos: unknown[];
  chartDatos?: unknown[];
}

// ==========================================
// Configuración
// ==========================================

export type TemaSistema = 'claro' | 'oscuro';

export interface Configuracion {
  nombre_sistema: string;
  logo_url: string;
  idioma: string;
  moneda: string;
  ia_modelo: string;
  ia_api_key: string;
  telegram_bot_token: string;
  [clave: string]: string;
}

export interface RespaldoPayload {
  formato: 'asistente-financiero-local';
  version: 2;
  tablas: Record<string, unknown[]>;
  esquema: Record<string, { nombre: string; tipo: string }[]>;
  sha256: string;
  exportado_en: string;
}

// ==========================================
// Módulo IA (Asistente financiero personal)
// ==========================================

export interface IaMeta {
  movimientos_analizados: number;
  periodo_desde: string | null;
  periodo_hasta: string | null;
}

export interface IaRespuesta {
  respuesta: string;
  meta: IaMeta;
}

export interface IaChatMensaje {
  rol: 'user' | 'ia';
  texto: string;
  timestamp: string;
}
