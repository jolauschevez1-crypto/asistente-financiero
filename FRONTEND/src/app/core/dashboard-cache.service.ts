import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { DashboardAdminData } from './models';

const TTL_DASHBOARD_MS = 60_000;

/**
 * Cache complementaria a la del backend (60s en adminModel.obtenerMetricasDashboard):
 * evita incluso el round-trip HTTP cuando la MISMA pestaña navega entre /admin y
 * /estadisticas dentro de la ventana de 60s. Tambien cachea la lista de categorias
 * (sin TTL: no cambia dentro de una sesion, no existe ninguna accion en el frontend
 * que cree categorias).
 */
@Injectable({ providedIn: 'root' })
export class DashboardCacheService {
  private readonly api = inject(ApiService);

  private dashboards = new Map<string, { obs$: Observable<DashboardAdminData>; expiraEn: number }>();
  private categorias$: Observable<string[]> | null = null;

  obtenerDashboardAdmin(moneda = 'USD'): Observable<DashboardAdminData> {
    let dashboard = this.dashboards.get(moneda);
    if (!dashboard || dashboard.expiraEn <= Date.now()) {
      dashboard = {obs$: this.api.obtenerDashboardAdmin(moneda).pipe(shareReplay(1)), expiraEn: Date.now() + TTL_DASHBOARD_MS};
      this.dashboards.set(moneda, dashboard);
    }
    return dashboard.obs$;
  }

  listarCategoriasGlobal(): Observable<string[]> {
    if (!this.categorias$) {
      this.categorias$ = this.api.listarCategoriasGlobal().pipe(shareReplay(1));
    }
    return this.categorias$;
  }
}
