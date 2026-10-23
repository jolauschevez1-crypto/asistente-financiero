import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export const CURRENCIES = [
  {codigo: 'USD', nombre: 'Dólar estadounidense', region: 'Ecuador / Estados Unidos'},
  {codigo: 'COP', nombre: 'Peso colombiano', region: 'Colombia'},
  {codigo: 'MXN', nombre: 'Peso mexicano', region: 'México'},
  {codigo: 'EUR', nombre: 'Euro', region: 'Zona euro'},
  {codigo: 'PEN', nombre: 'Sol peruano', region: 'Perú'},
  {codigo: 'ARS', nombre: 'Peso argentino', region: 'Argentina'},
  {codigo: 'CLP', nombre: 'Peso chileno', region: 'Chile'},
] as const;
export type CurrencyCode = typeof CURRENCIES[number]['codigo'];
export interface CurrencyPreferences {moneda: CurrencyCode; puede_cambiar: boolean; motivo: string; monedas: {codigo: string; nombre: string}[]}
const LOCALES: Record<CurrencyCode,string> = {USD:'es-EC',COP:'es-CO',MXN:'es-MX',EUR:'es-ES',PEN:'es-PE',ARS:'es-AR',CLP:'es-CL'};
export function currencyCode(value?: string | null): CurrencyCode {return CURRENCIES.some(c=>c.codigo===value)?value as CurrencyCode:'USD';}

/** Formats the recorded amount, never converts it or consults an exchange rate. */
export function formatCurrency(value: number | string | null | undefined, code?: string | null): string {
  const currency=currencyCode(code);const amount=Number(value);
  return new Intl.NumberFormat(LOCALES[currency],{style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(amount)?amount:0);
}

@Injectable({providedIn:'root'})
export class CurrencyService {
  private readonly http=inject(HttpClient);
  private readonly auth=inject(AuthService);
  private readonly endpoint=`${environment.apiBaseUrl}/finanzas/preferencias`;
  private loadedFor: number | null = null;
  readonly codigo=computed(()=>currencyCode(this.auth.usuario()?.moneda));
  readonly opciones=CURRENCIES;
  readonly preferencias=signal<CurrencyPreferences|null>(null);
  readonly cargando=signal(false);
  readonly guardando=signal(false);
  readonly error=signal('');
  readonly mensaje=signal('');
  format(value:number|string|null|undefined,code?:string|null){return formatCurrency(value,code||this.codigo());}
  load(force=false):void {
    const id=this.auth.usuario()?.id;if(!id||this.cargando()||(!force&&this.loadedFor===id))return;
    if(this.loadedFor!==id)this.preferencias.set(null);
    this.cargando.set(true);this.error.set('');
    this.http.get<{success:boolean;data:CurrencyPreferences}>(this.endpoint).pipe(finalize(()=>this.cargando.set(false))).subscribe({
      next:response=>{if(this.auth.usuario()?.id!==id)return;this.accept(response.data);this.loadedFor=id;},
      error:err=>{if(this.auth.usuario()?.id===id)this.error.set(err?.error?.message||'No se pudo consultar la moneda de tu cuenta. Vuelve a intentar.');},
    });
  }
  save(code:string):void {
    const id=this.auth.usuario()?.id;if(!id||this.guardando())return;
    this.error.set('');this.mensaje.set('');
    if(!CURRENCIES.some(c=>c.codigo===code)){this.error.set('Selecciona una moneda disponible.');return;}
    this.guardando.set(true);
    this.http.patch<{success:boolean;data:CurrencyPreferences}>(this.endpoint,{moneda:code}).pipe(finalize(()=>this.guardando.set(false))).subscribe({
      next:response=>{if(this.auth.usuario()?.id!==id)return;this.accept(response.data);this.loadedFor=id;this.mensaje.set(`Moneda guardada: ${response.data.moneda}. Los importes no se convierten.`);},
      error:err=>{if(this.auth.usuario()?.id!==id)return;const message=err?.error?.message||'No se pudo guardar la moneda. Tu configuración anterior se conserva.';this.error.set(message);if(err?.error?.code==='MONEDA_BLOQUEADA')this.preferencias.update(p=>p?{...p,puede_cambiar:false,motivo:message}:p);},
    });
  }
  private accept(data:CurrencyPreferences){this.preferencias.set(data);this.auth.actualizarUsuarioLocal({moneda:currencyCode(data.moneda)});}
}
