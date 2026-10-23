import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Configuracion } from './models';

/**
 * Cachea las respuestas de configuracion (rara vez cambia, salvo guardado explicito) para
 * evitar pedirlas de nuevo en cada componente/navegacion. `invalidar()` limpia ambos
 * observables cacheados tras un guardado o restauracion de respaldo exitosos.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly api = inject(ApiService);
  private configuracion$: Observable<Configuracion> | null = null;
  private configuracionAdmin$: Observable<Configuracion> | null = null;

  obtenerConfiguracion(): Observable<Configuracion> {
    if (!this.configuracion$) {
      this.configuracion$ = this.api.obtenerConfiguracion().pipe(shareReplay(1));
    }
    return this.configuracion$;
  }

  obtenerConfiguracionAdmin(): Observable<Configuracion> {
    if (!this.configuracionAdmin$) {
      this.configuracionAdmin$ = this.api.obtenerConfiguracionAdmin().pipe(shareReplay(1));
    }
    return this.configuracionAdmin$;
  }

  actualizarConfiguracion(cambios: Partial<Configuracion>): Observable<Configuracion> {
    return this.api.actualizarConfiguracion(cambios).pipe(tap(() => this.invalidar()));
  }

  /** Limpia ambos observables cacheados (llamar tras guardar o restaurar un respaldo). */
  invalidar(): void {
    this.configuracion$ = null;
    this.configuracionAdmin$ = null;
  }
}
