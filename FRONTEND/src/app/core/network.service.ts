import { Injectable, signal } from '@angular/core';

/**
 * @service NetworkService
 * @description Monitorea en tiempo real el estado de conexión a Internet (online/offline).
 */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly enLinea = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.enLinea.set(true));
      window.addEventListener('offline', () => this.enLinea.set(false));
    }
  }
}
