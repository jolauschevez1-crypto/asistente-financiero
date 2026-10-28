import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, NgZone, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { UsuarioPerfil } from '../../core/models';
import { SnackbarService } from '../../core/snackbar.service';
import { nonBlank, passwordLength, PERSON_NAME } from '../../core/input-validation';

type PerfilTab = 'datos' | 'seguridad' | 'google';

const coincidenPasswordsValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const nueva = control.get('nuevaPassword')?.value;
  const confirmar = control.get('confirmarPassword')?.value;
  return nueva && confirmar && nueva !== confirmar ? { passwordsNoCoinciden: true } : null;
};

@Component({
  selector: 'app-perfil',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Perfil implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackbar = inject(SnackbarService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly usuario = this.auth.usuario;
  readonly miPerfil = signal<UsuarioPerfil | null>(null);

  readonly tabActiva = signal<PerfilTab>('datos');
  readonly cargando = signal(false);
  readonly guardandoNombre = signal(false);
  readonly guardandoPassword = signal(false);
  readonly procesandoGoogle = signal(false);
  readonly verPassword = signal(false);
  readonly subiendoFoto = signal(false);
  readonly fotoSeleccionadaBase64 = signal<string | null>(null);

  get fotoGuardada(): string | null {
    return (
      this.miPerfil()?.fotoUrl ||
      this.usuario()?.foto_url ||
      (this.usuario() as any)?.fotoUrl ||
      null
    );
  }

  get fotoVigente(): string | null {
    return this.fotoSeleccionadaBase64() || this.fotoGuardada;
  }

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const archivo = input.files[0];
    if (!['image/png', 'image/jpeg'].includes(archivo.type)) {
      this.snackbar.error('Selecciona una imagen JPG o PNG.');
      return;
    }

    if (archivo.size > 2 * 1024 * 1024) {
      this.snackbar.error('La imagen no debe superar los 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.fotoSeleccionadaBase64.set(base64);
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(archivo);
  }

  guardarFotoSeleccionada(): void {
    const base64 = this.fotoSeleccionadaBase64();
    if (!base64) return;

    this.subiendoFoto.set(true);
    this.cdr.markForCheck();
    this.api.subirAvatarCloudinary(base64).subscribe({
      next: (res) => {
        this.subiendoFoto.set(false);
        this.fotoSeleccionadaBase64.set(null);
        this.snackbar.exito('¡Foto de perfil actualizada correctamente!');
        if (res.fotoUrl) {
          this.auth.actualizarUsuarioLocal({ foto_url: res.fotoUrl });
        }
        this.cargarPerfil();
      },
      error: (err) => {
        this.subiendoFoto.set(false);
        this.snackbar.error(err.error?.message || 'Error al actualizar la foto de perfil.');
        this.cdr.markForCheck();
      }
    });
  }

  cancelarFotoSeleccionada(): void {
    this.fotoSeleccionadaBase64.set(null);
    this.cdr.markForCheck();
  }

  readonly eliminandoFoto = signal(false);

  eliminarFoto(): void {
    if (!confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?')) return;

    this.eliminandoFoto.set(true);
    this.cdr.markForCheck();
    this.api.eliminarAvatarCloudinary().subscribe({
      next: () => {
        this.eliminandoFoto.set(false);
        this.fotoSeleccionadaBase64.set(null);
        this.snackbar.exito('Foto de perfil eliminada correctamente.');
        this.auth.actualizarUsuarioLocal({ foto_url: null });
        this.cargarPerfil();
      },
      error: (err) => {
        this.eliminandoFoto.set(false);
        this.snackbar.error(err.error?.message || 'Error al eliminar la foto de perfil.');
        this.cdr.markForCheck();
      }
    });
  }

  readonly perfilForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, nonBlank, Validators.pattern(PERSON_NAME), Validators.minLength(2), Validators.maxLength(100)]],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      passwordActual: [''],
      nuevaPassword: ['', [Validators.required, passwordLength]],
      confirmarPassword: ['', [Validators.required, passwordLength]],
    },
    { validators: [coincidenPasswordsValidator] }
  );

  ngOnInit(): void {
    this.cargarPerfil();
  }

  private verificarGoogleCallbackHash(): void {
    const hash = window.location.hash;
    if (hash && hash.includes('id_token=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const idToken = params.get('id_token');
      if (idToken) {
        window.history.replaceState(null, '', window.location.pathname);
        this.procesarGoogleVinculoCredential(idToken);
      }
    }
  }

  vincularConGoogleOAuthDirecto(): void {
    this.snackbar.error('Vincular Google desde el perfil no está disponible en esta versión.');
  }

  cargarPerfil(): void {
    this.cargando.set(true);
    this.api.obtenerMiPerfil().subscribe({
      next: (perfil: UsuarioPerfil) => {
        this.miPerfil.set(perfil);
        this.perfilForm.patchValue({ nombre: perfil.nombre || '' });
        if (perfil.fotoUrl) {
          this.auth.actualizarUsuarioLocal({ foto_url: perfil.fotoUrl, nombre: perfil.nombre });
        }
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.cargando.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        this.snackbar.error(err?.error?.message || 'No se pudo cargar la información del perfil.');
        this.cdr.markForCheck();
      },
    });
  }

  get rolLabel(): string {
    const rol = String(this.miPerfil()?.rol || this.usuario()?.rol || '').toUpperCase();
    return rol === 'ADMIN' || rol === 'ADMINISTRADOR' ? 'Administrador' : 'Usuario';
  }

  cambiarTab(tab: PerfilTab): void {
    this.tabActiva.set(tab);
  }

  private inicializarGoogleVincularButton(): void {
    const windowGoogle = (window as unknown as { google?: any }).google;
    if (windowGoogle?.accounts?.id) {
      windowGoogle.accounts.id.initialize({
        client_id: '94382187078-los2gff6ktv0r9bhv89jn3eice20g9s0.apps.googleusercontent.com',
        ux_mode: 'popup',
        callback: (res: { credential: string }) => {
          this.ngZone.run(() => this.procesarGoogleVinculoCredential(res.credential));
        },
      });

      const container = document.getElementById('google-vincular-btn-container');
      if (container) {
        container.innerHTML = '';
        windowGoogle.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          locale: 'es',
        });
      }
    } else {
      setTimeout(() => this.inicializarGoogleVincularButton(), 300);
    }
  }

  vincularConGoogle(): void {
    const windowGoogle = (window as unknown as { google?: any }).google;
    if (windowGoogle?.accounts?.id) {
      windowGoogle.accounts.id.initialize({
        client_id: '94382187078-los2gff6ktv0r9bhv89jn3eice20g9s0.apps.googleusercontent.com',
        ux_mode: 'popup',
        callback: (res: { credential: string }) => {
          this.ngZone.run(() => this.procesarGoogleVinculoCredential(res.credential));
        },
      });

      windowGoogle.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          this.snackbar.error('Si no se abre la ventana de Google, verifica que http://localhost:4200 esté guardado en los Orígenes autorizados de tu Google Cloud Console.');
        }
      });
    } else {
      this.snackbar.error('El servicio de Google Sign-In aún no está cargado.');
    }
  }

  private procesarGoogleVinculoCredential(credential: string): void {
    if (!credential) return;
    this.procesandoGoogle.set(true);
    this.cdr.markForCheck();
    this.api.vincularGoogleMiPerfil(credential).subscribe({
      next: () => {
        this.procesandoGoogle.set(false);
        this.snackbar.exito('¡Cuenta de Google vinculada con éxito!');
        this.cargarPerfil();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.procesandoGoogle.set(false);
        this.snackbar.error(err?.error?.message || 'Error al vincular con Google.');
        this.cdr.markForCheck();
      },
    });
  }

  toggleVerPassword(): void {
    this.verPassword.update((v) => !v);
  }

  guardarNombre(): void {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    this.guardandoNombre.set(true);
    const { nombre } = this.perfilForm.getRawValue();

    this.api.actualizarMiPerfil(nombre).subscribe({
      next: (updated: UsuarioPerfil) => {
        this.guardandoNombre.set(false);
        this.miPerfil.set(updated);
        this.snackbar.exito('Nombre actualizado correctamente.');
      },
      error: (err: any) => {
        this.guardandoNombre.set(false);
        this.snackbar.error(err?.error?.message || 'Error al actualizar el nombre.');
      },
    });
  }

  cambiarPassword(): void {
    if (this.passwordForm.controls.nuevaPassword.value !== this.passwordForm.controls.confirmarPassword.value) {
      this.snackbar.error('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.guardandoPassword.set(true);
    const { passwordActual, nuevaPassword } = this.passwordForm.getRawValue();

    this.api.cambiarMiPassword(passwordActual, nuevaPassword).subscribe({
      next: () => {
        this.guardandoPassword.set(false);
        this.passwordForm.reset();
        this.snackbar.exito('Contraseña actualizada. Inicia sesión con la nueva contraseña.');
        this.auth.logout();
      },
      error: (err: any) => {
        this.guardandoPassword.set(false);
        this.snackbar.error(err?.error?.message || 'No se pudo cambiar la contraseña.');
      },
    });
  }

  desvincularGoogle(): void {
    this.procesandoGoogle.set(true);
    this.api.desvincularGoogleMiPerfil().subscribe({
      next: () => {
        this.procesandoGoogle.set(false);
        this.snackbar.exito('Cuenta de Google desvinculada.');
        this.cargarPerfil();
      },
      error: (err: any) => {
        this.procesandoGoogle.set(false);
        this.snackbar.error(err?.error?.message || 'Error al desvincular Google.');
      },
    });
  }

  get avatarInitials(): string {
    const nombre = this.miPerfil()?.nombre || this.usuario()?.nombre || '';
    if (nombre.trim()) {
      const partes = nombre.trim().split(/\s+/).filter(Boolean);
      const primera = partes[0]?.[0] ?? '';
      const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
      return (primera + ultima).toUpperCase();
    }
    return (this.usuario()?.correo?.[0] ?? '?').toUpperCase();
  }
}
