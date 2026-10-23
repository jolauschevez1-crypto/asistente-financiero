import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';

import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';

import { authInterceptor } from './core/auth.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { timezone: 'America/Guayaquil' },
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        hasBackdrop: true,
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        panelClass: 'app-dialog-panel',
      },
    },
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useValue: { showDelay: 400, hideDelay: 100, touchendHideDelay: 1500 },
    },
    {
      // mat-icon aplica la clase 'material-icons' por defecto; al migrar a Material Symbols
      // Outlined (index.html) esa clase quedo sin font-family. Esto le dice a mat-icon que
      // use la clase 'material-symbols-outlined' en su lugar, que es la que Google sirve.
      provide: MAT_ICON_DEFAULT_OPTIONS,
      useValue: { fontSet: 'material-symbols-outlined' },
    },
  ]
};
