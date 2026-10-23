import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, map, shareReplay } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Deduplica llamadas concurrentes a /api/auth/refresh: si varias peticiones fallan con
 * 401/403 al mismo tiempo (ej. el access token expiro justo cuando el dashboard dispara
 * varias llamadas), solo se hace UNA llamada real de refresh y todas comparten su resultado.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private readonly auth = inject(AuthService);
  private refreshEnCurso: Observable<string> | null = null;

  refreshAccessToken(): Observable<string> {
    if (!this.refreshEnCurso) {
      this.refreshEnCurso = this.auth.refreshToken().pipe(
        map((response) => response.token),
        finalize(() => {
          this.refreshEnCurso = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.refreshEnCurso;
  }
}
