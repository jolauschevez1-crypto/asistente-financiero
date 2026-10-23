import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  ApiResponse,
  BalanceUsuario,
  Configuracion,
  CrearMovimientoPayload,
  Cuenta,
  DashboardAdminData,
  EstadisticasUsuario,
  IaChatMensaje,
  IaRespuesta,
  ListarMovimientosGlobalesParams,
  ListarUsuariosParams,
  Movimiento,
  MovimientoGlobal,
  MovimientoPayload,
  PaginatedMeta,
  PaginatedResponse,
  ReporteData,
  ReporteFiltros,
  ReporteFormatoExport,
  ReporteTipo,
  RespaldoPayload,
  Usuario,
  UsuarioListado,
  UsuarioPerfil,
} from './models';

import { environment } from '../../environments/environment';

const API_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  private buildHttpParams(params: Record<string, unknown>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        httpParams = httpParams.set(clave, String(valor));
      }
    });
    return httpParams;
  }

  // ==========================================
  // AUTOGESTIÓN DE PERFIL PROPIO
  // ==========================================

  obtenerMiPerfil(): Observable<UsuarioPerfil> {
    return this.http.get<UsuarioPerfil>(`${API_URL}/usuarios/me/perfil?t=${Date.now()}`);
  }

  actualizarMiPerfil(nombre: string): Observable<UsuarioPerfil> {
    return this.http.put<UsuarioPerfil>(`${API_URL}/usuarios/me/perfil`, { nombre });
  }

  cambiarMiPassword(passwordActual: string, nuevaPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${API_URL}/usuarios/me/password`, {
      passwordActual,
      nuevaPassword,
    });
  }

  vincularGoogleMiPerfil(credential: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${API_URL}/usuarios/me/vincular-google`, { credential });
  }

  desvincularGoogleMiPerfil(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${API_URL}/usuarios/me/vincular-google`);
  }

  subirAvatarCloudinary(imagen: string): Observable<{ success: boolean; message: string; fotoUrl: string }> {
    return this.http.post<{ success: boolean; message: string; fotoUrl: string }>(`${API_URL}/usuarios/me/avatar`, { imagen });
  }

  eliminarAvatarCloudinary(): Observable<{ success: boolean; message: string; fotoUrl: null }> {
    return this.http.delete<{ success: boolean; message: string; fotoUrl: null }>(`${API_URL}/usuarios/me/avatar`);
  }

  listarUsuarios(params: ListarUsuariosParams = {}): Observable<PaginatedResponse<UsuarioListado>> {
    const httpParams = this.buildHttpParams(params as Record<string, unknown>);

    return this.http
      .get<ApiResponse<UsuarioListado[]> & { meta: PaginatedMeta }>(`${API_URL}/usuarios`, { params: httpParams })
      .pipe(map((response) => ({ data: response.data, meta: response.meta })));
  }

  obtenerUsuarioPorId(id: number): Observable<Usuario> {
    return this.http
      .get<ApiResponse<Usuario>>(`${API_URL}/usuarios/${id}`)
      .pipe(map((response) => response.data));
  }

  reactivarUsuario(id: number): Observable<Usuario> {
    return this.http
      .put<ApiResponse<Usuario>>(`${API_URL}/usuarios/${id}/reactivar`, {})
      .pipe(map((response) => response.data));
  }

  restablecerPassword(id: number, password: string): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${API_URL}/usuarios/${id}/password`, { password });
  }

  obtenerEstadisticasUsuario(id: number): Observable<EstadisticasUsuario> {
    return this.http
      .get<ApiResponse<EstadisticasUsuario>>(`${API_URL}/usuarios/${id}/estadisticas`)
      .pipe(map((response) => response.data));
  }

  buscarUsuariosPorCorreo(correo: string): Observable<Usuario[]> {
    return this.http
      .get<ApiResponse<Usuario[]>>(`${API_URL}/usuarios/buscar`, { params: { correo } })
      .pipe(map((response) => response.data));
  }

  actualizarUsuario(id: number, payload: Partial<Usuario> & { password?: string }): Observable<Usuario> {
    return this.http
      .put<ApiResponse<Usuario>>(`${API_URL}/usuarios/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  deshabilitarUsuario(id: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${API_URL}/usuarios/${id}`);
  }

  obtenerCuentasUsuario(usuarioId: number): Observable<BalanceUsuario> {
    return this.http
      .get<ApiResponse<BalanceUsuario>>(`${API_URL}/usuarios/${usuarioId}/cuentas`)
      .pipe(map((response) => response.data));
  }

  listarMovimientosUsuario(usuarioId: number): Observable<Movimiento[]> {
    return this.http
      .get<ApiResponse<Movimiento[]>>(`${API_URL}/usuarios/${usuarioId}/movimientos`)
      .pipe(map((response) => response.data));
  }

  actualizarMovimiento(
    usuarioId: number,
    movimientoId: number,
    payload: MovimientoPayload,
  ): Observable<Movimiento> {
    return this.http
      .put<ApiResponse<Movimiento>>(`${API_URL}/usuarios/${usuarioId}/movimientos/${movimientoId}`, payload)
      .pipe(map((response) => response.data));
  }

  eliminarMovimiento(usuarioId: number, movimientoId: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${API_URL}/usuarios/${usuarioId}/movimientos/${movimientoId}`);
  }

  obtenerMisCuentas(): Observable<BalanceUsuario> {
    return this.http.get<ApiResponse<BalanceUsuario>>(`${API_URL}/movimientos/cuentas`).pipe(
      map((response) => {
        const balance = response.data;
        return {
          ...balance,
          balance_total: balance.balance_total ?? balance.balanceTotal ?? 0,
          cuentas: balance.cuentas || [],
        };
      }),
    );
  }

  crearCuenta(nombre: string): Observable<Cuenta> {
    return this.http
      .post<ApiResponse<Cuenta>>(`${API_URL}/movimientos/cuentas`, { nombre })
      .pipe(map((response) => response.data));
  }

  listarMisMovimientos(): Observable<Movimiento[]> {
    return this.http
      .get<ApiResponse<Movimiento[]>>(`${API_URL}/movimientos`)
      .pipe(map((response) => response.data));
  }

  registrarMovimiento(payload: CrearMovimientoPayload): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${API_URL}/movimientos`, payload)
      .pipe(map((response) => response.data));
  }

  obtenerDashboardAdmin(moneda = 'USD'): Observable<DashboardAdminData> {
    return this.http
      .get<ApiResponse<DashboardAdminData>>(`${API_URL}/reportes/web/dashboard-admin`, { params: { moneda } })
      .pipe(map((response) => response.data));
  }

  listarMovimientosGlobal(params: ListarMovimientosGlobalesParams = {}): Observable<PaginatedResponse<MovimientoGlobal>> {
    const httpParams = this.buildHttpParams(params as Record<string, unknown>);
    return this.http
      .get<ApiResponse<MovimientoGlobal[]> & { meta: PaginatedMeta }>(`${API_URL}/movimientos/admin/todos`, { params: httpParams })
      .pipe(map((response) => ({ data: response.data, meta: response.meta })));
  }

  listarCategoriasGlobal(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${API_URL}/movimientos/admin/categorias`)
      .pipe(map((response) => response.data));
  }

  duplicarMovimientoGlobal(id: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${API_URL}/movimientos/admin/${id}/duplicar`, {})
      .pipe(map((response) => response.data));
  }

  exportarMovimientosGlobal(params: ListarMovimientosGlobalesParams = {}): Observable<Blob> {
    const httpParams = this.buildHttpParams(params as Record<string, unknown>);
    return this.http.get(`${API_URL}/movimientos/admin/exportar`, { params: httpParams, responseType: 'blob' });
  }

  generarReporte(tipo: ReporteTipo, filtros: ReporteFiltros = {}): Observable<ReporteData> {
    const httpParams = this.buildHttpParams({ tipo, ...filtros } as Record<string, unknown>);
    return this.http
      .get<ApiResponse<ReporteData>>(`${API_URL}/reportes/admin/generar`, { params: httpParams })
      .pipe(map((response) => response.data));
  }

  exportarReporte(tipo: ReporteTipo, formato: ReporteFormatoExport, filtros: ReporteFiltros = {}): Observable<Blob> {
    const httpParams = this.buildHttpParams({ tipo, formato, ...filtros } as Record<string, unknown>);
    return this.http.get(`${API_URL}/reportes/admin/exportar`, { params: httpParams, responseType: 'blob' });
  }

  obtenerConfiguracion(): Observable<Configuracion> {
    return this.http
      .get<ApiResponse<Configuracion>>(`${API_URL}/configuracion`)
      .pipe(map((response) => response.data));
  }

  obtenerConfiguracionAdmin(): Observable<Configuracion> {
    return this.http
      .get<ApiResponse<Configuracion>>(`${API_URL}/configuracion/admin`)
      .pipe(map((response) => response.data));
  }

  actualizarConfiguracion(cambios: Partial<Configuracion>): Observable<Configuracion> {
    return this.http
      .put<ApiResponse<Configuracion>>(`${API_URL}/configuracion`, cambios)
      .pipe(map((response) => response.data));
  }

  exportarRespaldo(): Observable<Blob> {
    return this.http.get(`${API_URL}/configuracion/respaldo`, { responseType: 'blob' });
  }

  restaurarRespaldo(datos: RespaldoPayload, confirmacion: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${API_URL}/configuracion/respaldo/restaurar`, { datos, confirmacion });
  }

  preguntarIA(pregunta: string, historial: IaChatMensaje[] = []): Observable<IaRespuesta> {
    return this.http
      .post<ApiResponse<IaRespuesta>>(`${API_URL}/ia/preguntar`, { pregunta, historial })
      .pipe(map((response) => response.data));
  }

  analizarGastosIA(): Observable<IaRespuesta> {
    return this.http
      .get<ApiResponse<IaRespuesta>>(`${API_URL}/ia/analizar-gastos`)
      .pipe(map((response) => response.data));
  }

  analizarIngresosIA(): Observable<IaRespuesta> {
    return this.http
      .get<ApiResponse<IaRespuesta>>(`${API_URL}/ia/analizar-ingresos`)
      .pipe(map((response) => response.data));
  }

  detectarGastosInnecesariosIA(): Observable<IaRespuesta> {
    return this.http
      .get<ApiResponse<IaRespuesta>>(`${API_URL}/ia/gastos-innecesarios`)
      .pipe(map((response) => response.data));
  }

  generarReporteIA(): Observable<IaRespuesta> {
    return this.http
      .get<ApiResponse<IaRespuesta>>(`${API_URL}/ia/reporte`)
      .pipe(map((response) => response.data));
  }

  generarPrediccionIA(): Observable<IaRespuesta> {
    return this.http
      .get<ApiResponse<IaRespuesta>>(`${API_URL}/ia/prediccion`)
      .pipe(map((response) => response.data));
  }

  generarConsejosIA(): Observable<IaRespuesta> {
    return this.http
      .get<ApiResponse<IaRespuesta>>(`${API_URL}/ia/consejos`)
      .pipe(map((response) => response.data));
  }
}
