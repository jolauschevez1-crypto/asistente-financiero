import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, throwError } from 'rxjs';
import { LoginResponse, RefreshResponse, Usuario } from './models';

import { environment } from '../../environments/environment';

const API_URL = environment.apiBaseUrl;
const TOKEN_KEY = 'asistente_financiero_token';
const REFRESH_TOKEN_KEY = 'asistente_financiero_refresh_token';
const USER_KEY = 'asistente_financiero_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuario = signal<Usuario | null>(this.readUser());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) { this.scheduleExpiration(); window.addEventListener('storage', () => this.scheduleExpiration()); }

  private expirationTimer?: ReturnType<typeof setTimeout>;
  private scheduleExpiration(): void {
    clearTimeout(this.expirationTimer);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const deadline = Math.min(Number(payload.exp), Number(payload.iat) + 1800) * 1000;
      if (!Number.isFinite(deadline) || deadline <= Date.now()) { this.logout(true); return; }
      this.expirationTimer = setTimeout(() => this.logout(true), deadline - Date.now());
    } catch { this.logout(true); }
  }

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { correo, password }).pipe(
      tap((response) => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
        this.usuario.set(response.usuario);
        this.scheduleExpiration();
      }),
    );
  }

  loginConGoogle(credential: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/google`, { credential }).pipe(
      tap((response) => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
        this.usuario.set(response.usuario);
        this.scheduleExpiration();
      }),
    );
  }

  /** Renueva el access token usando el refresh token almacenado. Usado por el interceptor ante un 401/403. */
  refreshToken(): Observable<RefreshResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible.'));
    }
    return this.http.post<RefreshResponse>(`${API_URL}/auth/refresh`, { refreshToken }).pipe(
      tap((response) => localStorage.setItem(TOKEN_KEY, response.token)),
    );
  }

  registrar(nombre: string, correo: string, password: string, fechaNacimiento?: string, moneda = 'USD'): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/register`, {
      nombre,
      correo,
      password,
      moneda,
      ...(fechaNacimiento ? { fechaNacimiento } : {}),
    });
  }

  solicitarRecuperacion(correo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/recuperar-password`, { correo });
  }

  verificarCodigo(correo: string, codigoIngresado: string): Observable<{ message: string; resetToken: string }> {
    return this.http.post<{ message: string; resetToken: string }>(`${API_URL}/auth/verificar-codigo`, {
      correo,
      codigoIngresado,
    });
  }

  cambiarPassword(correo: string, nuevaContrasena: string, resetToken: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/auth/cambiar-password`, {
      correo,
      nuevaContrasena,
      resetToken,
    });
  }

  actualizarUsuarioLocal(datos: Partial<Usuario>): void {
    const actual = this.usuario();
    if (!actual) return;
    const actualizado = { ...actual, ...datos };
    localStorage.setItem(USER_KEY, JSON.stringify(actualizado));
    this.usuario.set(actualizado);
  }

  logout(expired = false): void {
    clearTimeout(this.expirationTimer);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.usuario.set(null);
    this.router.navigate(['/login'], { queryParams: expired ? { sesion: 'expirada' } : {} });
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAdmin(): boolean {
    return ['ADMIN', 'ADMINISTRADOR'].includes(this.rolActual());
  }

  isUser(): boolean {
    return ['USER', 'USUARIO'].includes(this.rolActual());
  }

  private rolActual(): string {
    return String(this.usuario()?.rol || '').toUpperCase();
  }

  private readUser(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
