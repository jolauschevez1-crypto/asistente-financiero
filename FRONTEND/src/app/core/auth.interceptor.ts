import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenRefreshService } from './token-refresh.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl + '/')) return next(req);
  const authService = inject(AuthService);
  const tokenRefresh = inject(TokenRefreshService);

  const esRutaAuth = req.url.startsWith(environment.apiBaseUrl + '/auth/');
  const token = esRutaAuth ? null : authService.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!esRutaAuth && error.status === 401) {
        const refreshToken = localStorage.getItem('asistente_financiero_refresh_token');
        if (!refreshToken) {
          authService.logout(true);
          return throwError(() => error);
        }

        return tokenRefresh.refreshAccessToken().pipe(
          catchError((errorRefresh) => {
            authService.logout(true);
            return throwError(() => errorRefresh);
          }),
          switchMap((nuevoToken) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${nuevoToken}` } })).pipe(
              catchError((retryError) => {
                if (retryError.status === 401) authService.logout(true);
                return throwError(() => retryError);
              }),
            ),
          ),
        );
      }

      return throwError(() => error);
    }),
  );
};
