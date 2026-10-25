export type Money = string | number;
export type FinanceSection = 'panel' | 'carteras' | 'presupuestos' | 'recurrentes' | 'deudas' | 'metas' | 'grupos';
export interface Wallet { id: number; nombre: string; moneda: string; saldo_actual: Money }
export interface Category { id: number; nombre: string }
export interface Budget { id: number; categoria_id: number; categoria: string; mes: string; moneda: string; limite: Money; gastado: Money; gastado_sin_tasa?: {moneda: string; monto: Money}[]; restante: Money; porcentaje: number }
export interface Recurring { id: number; nombre: string; tipo: 'INGRESO' | 'GASTO'; monto: Money; categoria_id: number; cuenta_id: number; cuenta: string; moneda: string; moneda_cuenta?: string; categoria: string; frecuencia: 'SEMANAL' | 'MENSUAL' | 'ANUAL'; proxima_fecha: string; activo: boolean; vencido: boolean }
export interface Debt { id: number; nombre: string; contraparte: string; tipo: 'PAGAR' | 'COBRAR'; moneda: string; monto: Money; fecha_vencimiento?: string; pagado: Money; pendiente: Money; estado: string }
export interface Goal { id: number; nombre: string; moneda: string; objetivo: Money; fecha_objetivo?: string; cuenta_id: number; cuenta: string; ahorrado: Money; restante: Money; porcentaje: number }
export interface Group { id: number; nombre: string; propietario_id: number; moneda: string; miembros: number; total_gastos: Money }
export interface GroupMember { activo?: boolean; id: number; nombre: string; correo: string; saldo: Money }
export interface GroupExpense { id: number; descripcion: string; monto: Money; pagador_id: number; fecha: string; participaciones: {usuario_id: number; monto: Money}[] }
export interface Settlement { id: number; desde_id: number; hacia_id: number; monto: Money; fecha: string }
export interface GroupDetail { grupo: {id: number; nombre: string; propietario_id: number; moneda: string}; miembros: GroupMember[]; gastos: GroupExpense[]; liquidaciones: Settlement[] }
export interface HistoryEntry { id: number; monto: Money; fecha?: string; created_at?: string; movimiento_id?: number; cuenta_id?: number; cuenta?: string; moneda?: string; monto_destino?: Money | null; moneda_destino?: string | null }
export interface RateStatus { estado: 'vigente' | 'desactualizada' | 'sin_tasa'; fuente: string; fecha_cotizacion: string | null; obtenida_en: string | null; antiguedad_dias: number | null }
export interface Quote { tasa: string; fuente: string; fecha_cotizacion: string; estado: RateStatus['estado']; antiguedad_dias: number | null }
export interface CurrencyBalance { moneda: string; saldo: Money; convertido: Money | null; tasa: string | null }
export interface TransferPreview { moneda_origen: string; moneda_destino: string; monto_origen: Money; monto_destino: Money; conversion: boolean; cotizacion?: Quote }
export interface ConversionPreview { cuenta_id: number; nombre: string; moneda_origen: string; moneda_destino: string; saldo_origen: Money; saldo_destino: Money; cotizacion: Quote; aviso: string }
export interface PanelData { moneda: string; saldo_total_completo: boolean; saldos_por_moneda: CurrencyBalance[]; saldos_sin_convertir: {moneda: string; saldo: Money}[];
  flujos_completos: boolean; flujos_por_moneda: {moneda: string; ingresos: Money; gastos: Money}[]; flujos_sin_tasa: {ingresos: {moneda: string; monto: Money}[]; gastos: {moneda: string; monto: Money}[]};
  tasas: RateStatus; tasas_a_base: Record<string, string | null>;
  tendencia: {mes: string; ingresos: Money; gastos: Money; completo: boolean}[]; gastos_categoria: {categoria: string; cantidad: number; monto_total: Money; sin_tasa: {moneda: string; monto: Money}[]}[];
  mes: string; saldo_total: Money; ingresos: Money; gastos: Money; neto: Money; carteras: Wallet[]; presupuestos: Budget[]; recurrentes: Recurring[]; deudas: Debt[]; metas: Goal[]; grupos: Group[]; alertas: (string | {tipo?: string; mensaje?: string; nombre?: string; descripcion?: string})[] }
export interface Conversion { id: number; cuenta_id: number; moneda_origen: string; moneda_destino: string; saldo_origen: Money; saldo_destino: Money; tasa: string; tasa_fuente: string; tasa_fecha: string; creado_en: string }
