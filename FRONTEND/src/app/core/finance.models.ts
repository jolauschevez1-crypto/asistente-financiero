export type Money = string | number;
export type FinanceSection = 'panel' | 'carteras' | 'presupuestos' | 'recurrentes' | 'deudas' | 'metas' | 'grupos';
export interface Wallet { id: number; nombre: string; saldo_actual: Money }
export interface Category { id: number; nombre: string }
export interface Budget { id: number; categoria_id: number; categoria: string; mes: string; limite: Money; gastado: Money; restante: Money; porcentaje: number }
export interface Recurring { id: number; nombre: string; tipo: 'INGRESO' | 'GASTO'; monto: Money; categoria_id: number; cuenta_id: number; cuenta: string; categoria: string; frecuencia: 'SEMANAL' | 'MENSUAL' | 'ANUAL'; proxima_fecha: string; activo: boolean; vencido: boolean }
export interface Debt { id: number; nombre: string; contraparte: string; tipo: 'PAGAR' | 'COBRAR'; monto: Money; fecha_vencimiento?: string; pagado: Money; pendiente: Money; estado: string }
export interface Goal { id: number; nombre: string; objetivo: Money; fecha_objetivo?: string; cuenta_id: number; cuenta: string; ahorrado: Money; restante: Money; porcentaje: number }
export interface Group { id: number; nombre: string; propietario_id: number; miembros: number; total_gastos: Money }
export interface GroupMember { activo?: boolean; id: number; nombre: string; correo: string; saldo: Money }
export interface GroupExpense { id: number; descripcion: string; monto: Money; pagador_id: number; fecha: string; participaciones: {usuario_id: number; monto: Money}[] }
export interface Settlement { id: number; desde_id: number; hacia_id: number; monto: Money; fecha: string }
export interface GroupDetail { grupo: {id: number; nombre: string; propietario_id: number}; miembros: GroupMember[]; gastos: GroupExpense[]; liquidaciones: Settlement[] }
export interface HistoryEntry { id: number; monto: Money; fecha?: string; created_at?: string; movimiento_id?: number; cuenta_id?: number }
export interface PanelData { mes: string; saldo_total: Money; ingresos: Money; gastos: Money; neto: Money; carteras: Wallet[]; presupuestos: Budget[]; recurrentes: Recurring[]; deudas: Debt[]; metas: Goal[]; grupos: Group[]; alertas: (string | {tipo?: string; mensaje?: string; nombre?: string; descripcion?: string})[] }
