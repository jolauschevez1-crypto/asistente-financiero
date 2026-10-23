export interface SidebarNavItem {
  label: string;
  icon: string;
  route: string | null;
  queryParams?: Record<string, string>;
  disabled?: boolean;
}

export const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/admin', queryParams: { vista: 'dashboard' }, disabled: false },
  { label: 'Usuarios', icon: 'group', route: '/admin', queryParams: { vista: 'usuarios' }, disabled: false },
  { label: 'Editar Usuario', icon: 'edit', route: '/admin', queryParams: { vista: 'usuarios' }, disabled: false },
  { label: 'Movimientos', icon: 'swap_horiz', route: '/admin', queryParams: { vista: 'movimientos' }, disabled: false },
  { label: 'Reportes', icon: 'bar_chart', route: '/admin', queryParams: { vista: 'reportes' }, disabled: false },
  { label: 'Estadísticas', icon: 'insights', route: '/estadisticas', disabled: false },
  { label: 'IA', icon: 'smart_toy', route: '/ia', disabled: false },
  { label: 'Mi Perfil', icon: 'person', route: '/perfil', disabled: false },
  { label: 'Configuración', icon: 'settings', route: '/configuracion', disabled: false },
];

export const USER_NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/usuario', disabled: false },
  { label: 'Movimientos', icon: 'swap_horiz', route: '/usuario', disabled: false },
  { label: 'IA', icon: 'smart_toy', route: '/ia', disabled: false },
  { label: 'Mi Perfil', icon: 'person', route: '/perfil', disabled: false },
];
