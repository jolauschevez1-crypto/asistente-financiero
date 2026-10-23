import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/finanzas`;
  get<T>(path: string) { return this.http.get<{success: boolean; data: T}>(`${this.base}/${path}`).pipe(map(r => r.data)); }
  post<T = unknown>(path: string, data: unknown) { return this.http.post<{success: boolean; data: T}>(`${this.base}/${path}`, data).pipe(map(r => r.data)); }
  put<T = unknown>(path: string, data: unknown) { return this.http.put<{success: boolean; data: T}>(`${this.base}/${path}`, data).pipe(map(r => r.data)); }
  delete(path: string) { return this.http.delete<{success: boolean; data: unknown}>(`${this.base}/${path}`); }
}
