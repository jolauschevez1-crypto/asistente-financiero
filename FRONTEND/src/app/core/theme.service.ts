import { Injectable } from '@angular/core';
import { TemaSistema } from './models';

const THEME_KEY = 'asistente_financiero_tema';
const TEMA_POR_DEFECTO: TemaSistema = 'oscuro';

/**
 * Tema claro/oscuro: preferencia 100% local (localStorage) por navegador, para
 * usuario y administrador por igual. No se persiste en el backend.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  obtenerTema(): TemaSistema {
    const guardado = localStorage.getItem(THEME_KEY);
    return guardado === 'oscuro' || guardado === 'claro' ? guardado : TEMA_POR_DEFECTO;
  }

  aplicarTema(tema: TemaSistema): void {
    document.documentElement.setAttribute('data-theme', tema);
  }

  guardarTema(tema: TemaSistema): void {
    localStorage.setItem(THEME_KEY, tema);
    this.aplicarTema(tema);
  }
}
