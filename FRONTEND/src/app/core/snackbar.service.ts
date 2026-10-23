import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

const BASE_CONFIG: MatSnackBarConfig = {
  duration: 4000,
  horizontalPosition: 'end',
  verticalPosition: 'bottom',
};

/**
 * Notificaciones transitorias (toast) para confirmaciones de exito/error de acciones
 * puntuales del usuario. No reemplaza a <app-notice>, que se mantiene para estados
 * de carga/error persistentes de una pagina.
 */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private readonly snackBar = inject(MatSnackBar);

  exito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...BASE_CONFIG,
      panelClass: ['app-snackbar', 'app-snackbar-success'],
    });
  }

  error(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...BASE_CONFIG,
      duration: 6000,
      panelClass: ['app-snackbar', 'app-snackbar-danger'],
    });
  }
}
