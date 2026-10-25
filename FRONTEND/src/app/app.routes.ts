import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  ...(['panel', 'carteras', 'presupuestos', 'recurrentes', 'deudas', 'metas', 'grupos'] as const).map(section => ({
    path: section,
    loadComponent: () => import('./pages/finance/finance').then(m => m.FinancePage),
    canActivate: [authGuard],
    data: {section},
  })),
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
    canActivate: [adminGuard],
  },
  {
    path: 'estadisticas',
    loadComponent: () => import('./pages/estadisticas/estadisticas').then((m) => m.Estadisticas),
    canActivate: [adminGuard],
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./pages/configuracion/configuracion').then((m) => m.Configuracion),
    canActivate: [adminGuard],
  },
  {
    path: 'ia',
    loadComponent: () => import('./pages/ia/ia').then((m) => m.Ia),
    canActivate: [authGuard],
  },
  // El antiguo módulo Movimientos vive ahora dentro de Carteras.
  { path: 'usuario', pathMatch: 'full', redirectTo: 'carteras' },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
    canActivate: [authGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
