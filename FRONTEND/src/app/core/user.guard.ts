import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const userGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.getToken() && auth.isUser()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { motivo: 'usuario' },
  });
};
