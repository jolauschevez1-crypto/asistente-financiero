import { GoogleSignin } from '../../shared/google-signin';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { nonBlank, passwordChecks, passwordLength, passwordMatchesIdentity, PERSON_NAME, validBirthDate } from '../../core/input-validation';
import { CURRENCIES } from '../../core/currency.service';

type LoginModo = 'login' | 'registro' | 'recuperar' | 'codigo' | 'nueva';
@Component({
  selector: 'app-login', imports: [CommonModule, ReactiveFormsModule, GoogleSignin],
  templateUrl: './login.html', styleUrl: './login.css', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private resetToken = '';
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly modo = signal<LoginModo>('login');
  readonly correoRecuperacion = signal('');
  readonly verPassword = signal(false);
  readonly monedas = CURRENCIES;
  readonly hoy = new Date().toLocaleDateString('en-CA');
  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', Validators.required],
  });
  readonly registroForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, nonBlank, Validators.pattern(PERSON_NAME), Validators.minLength(2), Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, passwordLength]],
    confirmarPassword: ['', Validators.required],
    fechaNacimiento: ['', validBirthDate],
    moneda: ['USD', [Validators.required, Validators.pattern(/^(USD|COP|MXN|EUR|PEN|ARS|CLP)$/)]],
  });
  readonly recuperacionForm = this.fb.nonNullable.group({ correo: ['', [Validators.required, Validators.email]] });
  readonly codigoForm = this.fb.nonNullable.group({ codigoIngresado: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]] });
  readonly nuevaPasswordForm = this.fb.nonNullable.group({
    nuevaContrasena: ['', [Validators.required, passwordLength]],
    confirmarContrasena: ['', Validators.required],
  });
  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('sesion') === 'expirada')
      this.mensaje.set('Tu sesión expiró. Inicia sesión nuevamente para continuar.');
  }
  toggleVerPassword(): void { this.verPassword.update(v => !v); }
  registroChecks() { const v = this.registroForm.getRawValue(); return passwordChecks(v.password, v.nombre, v.correo); }
  nuevaChecks() { return passwordChecks(this.nuevaPasswordForm.getRawValue().nuevaContrasena, '', this.correoRecuperacion()); }
  /** En campos de nombre solo se admiten letras, espacios, guiones y apóstrofes al escribir. */
  soloLetras(event: InputEvent): void { if (event.data && !/^[\p{L}\p{M} '’-]+$/u.test(event.data)) event.preventDefault(); }
  private failure(err: any, fallback: string): void {
    this.cargando.set(false);
    this.error.set(err?.status === 0 ? 'No se puede conectar al servidor. Revisa tu conexión o comprueba que el servidor local esté iniciado.' :
      err?.error?.message || fallback);
  }
  ingresar(): void {
    if (this.cargando()) return;
    this.error.set(''); this.mensaje.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Revisa el correo y la contraseña.'); return; }
    const { correo, password } = this.form.getRawValue();
    this.cargando.set(true);
    this.auth.login(correo.trim(), password).subscribe({
      next: () => { this.cargando.set(false); this.router.navigateByUrl(this.auth.isAdmin() ? '/admin' : '/panel'); },
      error: err => this.failure(err, 'No se pudo iniciar sesión.'),
    });
  }
  mostrarRegistro(): void { this.clearFlow('registro'); this.registroForm.patchValue({ correo: this.form.controls.correo.value }); }
  mostrarRecuperacion(): void { this.clearFlow('recuperar'); this.recuperacionForm.patchValue({ correo: this.form.controls.correo.value }); }
  mostrarLogin(): void { this.clearFlow('login'); }
  private clearFlow(mode: LoginModo): void {
    this.error.set(''); this.mensaje.set(''); this.modo.set(mode); this.resetToken = '';
    this.codigoForm.reset(); this.nuevaPasswordForm.reset();
  }
  registrar(): void {
    if (this.cargando()) return;
    this.error.set('');
    if (this.registroForm.invalid) { this.registroForm.markAllAsTouched(); this.error.set('Revisa los campos marcados. La contraseña debe cumplir todos los requisitos de la lista.'); return; }
    const { nombre, correo, password, confirmarPassword, fechaNacimiento, moneda } = this.registroForm.getRawValue();
    if (password !== confirmarPassword) { this.error.set('Las contraseñas no coinciden.'); return; }
    if (passwordMatchesIdentity(password, nombre, correo)) { this.error.set('La contraseña no puede ser igual ni contener tu nombre, tu correo o tu nombre de usuario.'); return; }
    this.cargando.set(true);
    this.auth.registrar(nombre.trim(), correo.trim(), password, fechaNacimiento || undefined, moneda).subscribe({
      next: response => {
        this.cargando.set(false); this.mensaje.set(response.message || 'Cuenta creada. Ya puedes iniciar sesión.');
        this.form.patchValue({ correo, password: '' }); this.registroForm.reset(); this.modo.set('login');
      }, error: err => this.failure(err, 'No se pudo crear la cuenta.'),
    });
  }
  solicitarCodigo(): void {
    if (this.cargando()) return;
    this.error.set(''); this.resetToken = '';
    if (this.recuperacionForm.invalid) { this.recuperacionForm.markAllAsTouched(); return; }
    const correo = this.recuperacionForm.getRawValue().correo.trim();
    this.cargando.set(true);
    this.auth.solicitarRecuperacion(correo).subscribe({
      next: response => {
        this.cargando.set(false); this.correoRecuperacion.set(correo);
        this.mensaje.set(response.message); this.modo.set('codigo');
      }, error: err => this.failure(err, 'No se pudo solicitar la recuperación.'),
    });
  }
  verificarCodigo(): void {
    if (this.cargando()) return;
    this.error.set('');
    if (this.codigoForm.invalid) { this.codigoForm.markAllAsTouched(); this.error.set('Ingresa un código de 6 dígitos.'); return; }
    this.cargando.set(true);
    this.auth.verificarCodigo(this.correoRecuperacion(), this.codigoForm.getRawValue().codigoIngresado).subscribe({
      next: response => {
        this.cargando.set(false);
        if (!response.resetToken) { this.error.set('No se recibió una autorización válida. Solicita un nuevo código.'); return; }
        this.resetToken = response.resetToken; this.mensaje.set(response.message); this.modo.set('nueva');
      }, error: err => this.failure(err, 'El código no es válido o ha expirado.'),
    });
  }
  cambiarPassword(): void {
    if (this.cargando()) return;
    this.error.set('');
    if (this.nuevaPasswordForm.invalid) { this.nuevaPasswordForm.markAllAsTouched(); this.error.set('La nueva contraseña debe cumplir todos los requisitos de la lista.'); return; }
    const { nuevaContrasena, confirmarContrasena } = this.nuevaPasswordForm.getRawValue();
    if (nuevaContrasena !== confirmarContrasena) { this.error.set('Las contraseñas no coinciden.'); return; }
    if (passwordMatchesIdentity(nuevaContrasena, '', this.correoRecuperacion())) { this.error.set('La contraseña no puede contener tu correo o nombre de usuario.'); return; }
    if (!this.resetToken) { this.error.set('Solicita un nuevo código de recuperación.'); return; }
    this.cargando.set(true);
    this.auth.cambiarPassword(this.correoRecuperacion(), nuevaContrasena, this.resetToken).subscribe({
      next: response => {
        this.cargando.set(false); this.resetToken = ''; this.mensaje.set(response.message);
        this.form.patchValue({ correo: this.correoRecuperacion(), password: '' });
        this.nuevaPasswordForm.reset(); this.codigoForm.reset(); this.modo.set('login');
      }, error: err => this.failure(err, 'No se pudo actualizar la contraseña.'),
    });
  }
}
