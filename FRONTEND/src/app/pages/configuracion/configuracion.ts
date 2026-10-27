import { passwordLength } from '../../core/input-validation';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfiguracionService } from '../../core/configuracion.service';
import { SnackbarService } from '../../core/snackbar.service';
import { Configuracion as ConfiguracionModel, RespaldoPayload } from '../../core/models';
import { Notice } from '../../shared/notice/notice';
import { PanelCard } from '../../shared/panel-card/panel-card';
import { Skeleton } from '../../shared/skeleton/skeleton';

@Component({
  selector: 'app-configuracion',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    PanelCard,
    Skeleton,
    Notice,
  ],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Configuracion implements OnInit {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly snackbar = inject(SnackbarService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');

  readonly nombreSistema = signal('');
  readonly logoUrl = signal('');
  readonly idioma = signal('es');
  readonly moneda = signal('PEN');
  readonly iaModelo = signal('');
  readonly iaApiKey = signal('');

  readonly confirmacionRestaurar = signal('');
  readonly archivoRestaurar = signal<File | null>(null);
  readonly restaurando = signal(false);

  readonly nuevaPassword = signal('');
  readonly confirmarPassword = signal('');
  readonly cambiandoPassword = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.configuracionService.obtenerConfiguracionAdmin().subscribe({
      next: (config) => {
        this.nombreSistema.set(config.nombre_sistema || '');
        this.logoUrl.set(config.logo_url || '');
        this.idioma.set(config.idioma || 'es');
        this.moneda.set(config.moneda || 'PEN');
        this.iaModelo.set(config.ia_modelo || '');
        this.iaApiKey.set(config.ia_api_key || '');
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.message || 'No se pudo cargar la configuracion.');
      },
    });
  }

  guardarIdiomaMoneda(): void {
    this.guardar({ idioma: this.idioma(), moneda: this.moneda() });
  }

  guardarMarca(): void {
    this.guardar({ nombre_sistema: this.nombreSistema(), logo_url: this.logoUrl() });
  }

  guardarIa(): void {
    this.guardar({ ia_modelo: this.iaModelo(), ia_api_key: this.iaApiKey() });
  }

  private guardar(cambios: Partial<ConfiguracionModel>): void {
    this.guardando.set(true);

    this.configuracionService.actualizarConfiguracion(cambios).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackbar.exito('Configuracion guardada correctamente.');
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackbar.error(err?.error?.message || 'No se pudo guardar la configuracion.');
      },
    });
  }

  descargarRespaldo(): void {
    this.api.exportarRespaldo().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `respaldo-${new Date().toISOString().slice(0, 10)}.json`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackbar.error('No se pudo descargar el respaldo.'),
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoRestaurar.set(input.files?.[0] ?? null);
  }

  restaurarRespaldo(): void {
    const archivo = this.archivoRestaurar();
    if (!archivo || this.confirmacionRestaurar() !== 'RESTAURAR') return;

    this.restaurando.set(true);
    this.error.set('');

    const lector = new FileReader();
    lector.onload = () => {
      let datos: RespaldoPayload;
      try {
        datos = JSON.parse(String(lector.result)) as RespaldoPayload;
      } catch {
        this.restaurando.set(false);
        this.error.set('El archivo seleccionado no es un JSON valido.');
        return;
      }

      this.api.restaurarRespaldo(datos, this.confirmacionRestaurar()).subscribe({
        next: () => {
          this.restaurando.set(false);
          this.snackbar.exito('Respaldo restaurado correctamente.');
          this.confirmacionRestaurar.set('');
          this.archivoRestaurar.set(null);
          this.configuracionService.invalidar(); // restaurarRespaldo tambien reemplaza 'configuracion'
          this.cargar();
        },
        error: (err) => {
          this.restaurando.set(false);
          this.snackbar.error(err?.error?.message || 'No se pudo restaurar el respaldo.');
        },
      });
    };
    lector.readAsText(archivo);
  }

  cambiarPassword(): void {
    const nueva = this.nuevaPassword();
    if (passwordLength({ value: nueva } as any)) {
      this.error.set('La nueva contraseña debe tener 10 caracteres o más (máximo 72 bytes), con mayúscula, minúscula, número y carácter especial, sin espacios.');
      return;
    }
    if (nueva !== this.confirmarPassword()) {
      this.error.set('Las contrasenas no coinciden.');
      return;
    }

    const idAdmin = this.authService.usuario()?.id;
    if (!idAdmin) return;

    this.cambiandoPassword.set(true);
    this.error.set('');

    this.api.restablecerPassword(idAdmin, nueva).subscribe({
      next: () => {
        this.cambiandoPassword.set(false);
        this.snackbar.exito('Contraseña actualizada. Inicia sesión nuevamente.');
        this.authService.logout();
        this.nuevaPassword.set('');
        this.confirmarPassword.set('');
      },
      error: (err) => {
        this.cambiandoPassword.set(false);
        this.snackbar.error(err?.error?.message || 'No se pudo actualizar la contrasena.');
      },
    });
  }
}
