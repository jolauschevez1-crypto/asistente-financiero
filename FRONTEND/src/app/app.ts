import { ChangeDetectionStrategy, Component, HostListener, OnInit, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth.service';
import { ConfiguracionService } from './core/configuracion.service';
import { ThemeService } from './core/theme.service';
import { NetworkService } from './core/network.service';
import { CurrencyService } from './core/currency.service';
import { TemaSistema } from './core/models';

@Component({selector:'app-root', imports:[RouterOutlet,RouterLink,RouterLinkActive], templateUrl:'./app.html', styleUrl:'./app.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class App implements OnInit {
  readonly auth = inject(AuthService);
  readonly currency = inject(CurrencyService);
  readonly network = inject(NetworkService);
  private readonly router = inject(Router);
  private readonly configuration = inject(ConfiguracionService);
  private readonly theme = inject(ThemeService);
  readonly mobileOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly brand = signal('Asistente Financiero');
  readonly tema = signal<TemaSistema>(this.theme.obtenerTema());
  readonly largeText = signal(localStorage.getItem('af_large_text') === 'true');
  readonly contrast = signal(localStorage.getItem('af_contrast') === 'true');
  readonly currentUrl = toSignal(this.router.events.pipe(filter((e):e is NavigationEnd=>e instanceof NavigationEnd),map(e=>e.urlAfterRedirects)), {initialValue:this.router.url});
  readonly links = [
    {route:'/panel',label:'Panel'}, {route:'/carteras',label:'Carteras'}, {route:'/usuario',label:'Movimientos'},
    {route:'/grupos',label:'Grupos'}, {route:'/presupuestos',label:'Presupuestos'}, {route:'/recurrentes',label:'Fijos'},
    {route:'/deudas',label:'Deudas'}, {route:'/metas',label:'Metas'}, {route:'/ia',label:'Asistente IA'},
  ];
  readonly adminLinks = [{route:'/admin',label:'Administración'},{route:'/estadisticas',label:'Estadísticas'},{route:'/configuracion',label:'Configuración'}];
  constructor(){
    this.theme.aplicarTema(this.tema()); this.applyAccessibility();
    this.router.events.pipe(filter(e=>e instanceof NavigationEnd)).subscribe(()=>{this.setMobile(false);this.userMenuOpen.set(false);});
    // Las monedas de presentación disponibles vienen del servidor (las que tienen tasa de referencia).
    effect(()=>{if(this.auth.usuario()?.id&&!this.auth.isAdmin())this.currency.load();});
  }
  get visibleLinks(){return this.auth.isAdmin()?[...this.adminLinks,...this.links.filter(l=>l.route!=='/usuario')]:this.links;}
  ngOnInit(){this.configuration.obtenerConfiguracion().subscribe({next:c=>this.brand.set(c.nombre_sistema?.trim()||'Asistente Financiero'),error:()=>{}});}
  get showLayout(){return !!this.auth.usuario() && !this.currentUrl().startsWith('/login');}
  get displayName(){return this.auth.usuario()?.nombre||this.auth.usuario()?.correo||'Mi perfil';}
  toggleTheme(){const value=this.tema()==='claro'?'oscuro':'claro';this.tema.set(value);this.theme.guardarTema(value);}
  toggleMobile(){this.setMobile(!this.mobileOpen());if(this.mobileOpen())setTimeout(()=>(document.querySelector('#mobile-navigation a') as HTMLElement|null)?.focus());}
  /** El menú móvil ocupa la pantalla: se bloquea el desplazamiento del fondo mientras está abierto. */
  private setMobile(open:boolean){this.mobileOpen.set(open);document.body.classList.toggle('af-menu-open',open);}
  toggleUserMenu(){this.userMenuOpen.update(v=>!v);}
  setCurrency(code:string){if(code&&code!==this.currency.codigo())this.currency.save(code);}
  toggleText(){this.largeText.update(v=>!v);this.applyAccessibility();}
  toggleContrast(){this.contrast.update(v=>!v);this.applyAccessibility();}
  private applyAccessibility(){document.documentElement.classList.toggle('af-large-text',this.largeText());document.documentElement.classList.toggle('af-high-contrast',this.contrast());localStorage.setItem('af_large_text',String(this.largeText()));localStorage.setItem('af_contrast',String(this.contrast()));}
  @HostListener('document:keydown.escape') closeMenus(){
    if(this.mobileOpen()){this.setMobile(false);document.getElementById('menu-toggle')?.focus();}
    if(this.userMenuOpen()){this.userMenuOpen.set(false);document.getElementById('user-menu-button')?.focus();}
  }
  @HostListener('document:click',['$event']) outside(event:MouseEvent){if(this.userMenuOpen()&&!(event.target as HTMLElement|null)?.closest?.('.user-menu'))this.userMenuOpen.set(false);}
  @HostListener('window:resize') resized(){if(this.mobileOpen()&&window.innerWidth>1180)this.setMobile(false);}
  logout(){this.auth.logout();}
}
