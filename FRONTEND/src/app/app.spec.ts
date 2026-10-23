import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth.service';

describe('Aplicación local y navegación', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({imports: [App], providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]}).compileComponents();
  });
  afterEach(()=>{TestBed.inject(HttpTestingController).verify();document.documentElement.classList.remove('af-large-text','af-high-contrast');});
  function create(){const fixture=TestBed.createComponent(App);fixture.detectChanges();TestBed.inject(HttpTestingController).expectOne('/api/configuracion').flush({success:true,data:{nombre_sistema:'Asistente Financiero'}});fixture.detectChanges();return fixture;}
  it('ofrece acceso al contenido y oculta menús privados sin sesión', () => {
    const fixture=create();const html=fixture.nativeElement as HTMLElement;
    expect(html.querySelector('main#main-content')).toBeTruthy();
    expect(html.querySelector('nav')).toBeNull();
  });
  it('navegación contiene módulos y accesibilidad conserva la preferencia', () => {
    TestBed.inject(AuthService).usuario.set({id:1,nombre:'Prueba',correo:'prueba@local.test',rol:'USUARIO'} as any);
    const fixture=create();const app=fixture.componentInstance;
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.textContent).toContain('Carteras');
    app.toggleText();expect(document.documentElement.classList.contains('af-large-text')).toBeTrue();
    expect(localStorage.getItem('af_large_text')).toBe('true');
    app.toggleMobile();app.closeMenus();expect(app.mobileOpen()).toBeFalse();
  });
});
