import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.getToken() && auth.isAdmin()) {
    return true;
  }

  // Un usuario con sesión pero sin rol de administrador vuelve a su panel (D-16).
  if (auth.getToken() && auth.isUser()) {
    return router.createUrlTree(['/panel']);
  }

  return router.createUrlTree(['/login'], {
    queryParams: { motivo: 'admin' },
  });
};
