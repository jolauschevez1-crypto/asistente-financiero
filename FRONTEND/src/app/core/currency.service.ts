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
export interface CurrencyPreferences {moneda: CurrencyCode; puede_cambiar: boolean; motivo: string | null; monedas: {codigo: string; nombre: string}[]; monedas_con_tasa?: string[]}
/** Monedas con tasa de referencia del BCE (Frankfurter); las demás se muestran aparte, sin convertir. */
export const CURRENCIES_WITH_RATE: readonly string[] = ['USD','EUR','MXN'];
const LOCALES: Record<CurrencyCode,string> = {USD:'es-EC',COP:'es-CO',MXN:'es-MX',EUR:'es-ES',PEN:'es-PE',ARS:'es-AR',CLP:'es-CL'};
export function currencyCode(value?: string | null): CurrencyCode {return CURRENCIES.some(c=>c.codigo===value)?value as CurrencyCode:'USD';}

/** Da formato a un importe en su propia moneda; nunca lo convierte. */
export function formatCurrency(value: number | string | null | undefined, code?: string | null): string {
  const currency=currencyCode(code);const amount=Number(value);
  // El código siempre va delante ("EUR 850,00"), sea cual sea la convención del país, para que las columnas se lean igual.
  const parts=new Intl.NumberFormat(LOCALES[currency],{style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2}).formatToParts(Number.isFinite(amount)?amount:0);
  const sign=parts.some(p=>p.type==='minusSign')?'-':'';
  const number=parts.filter(p=>['integer','group','decimal','fraction'].includes(p.type)).map(p=>p.value).join('');
  return `${sign}${currency}\u00a0${number}`;
}

@Injectable({providedIn:'root'})
export class CurrencyService {
  private readonly http=inject(HttpClient);
  private readonly auth=inject(AuthService);
  private readonly endpoint=`${environment.apiBaseUrl}/finanzas/preferencias`;
  private loadedFor: number | null = null;
  readonly codigo=computed(()=>currencyCode(this.auth.usuario()?.moneda));
  readonly opciones=CURRENCIES;
  /** Monedas en las que se puede presentar el panel consolidado. */
  readonly presentables=computed(()=>{const list=this.preferencias()?.monedas_con_tasa||CURRENCIES_WITH_RATE;return CURRENCIES.filter(c=>list.includes(c.codigo));});
  readonly preferencias=signal<CurrencyPreferences|null>(null);
  /** Moneda del panel consolidado: la preferida si tiene tasa de referencia; si no, USD. */
  readonly presentacion=computed(()=>this.presentables().some(c=>c.codigo===this.codigo())?this.codigo():'USD');
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
      next:response=>{if(this.auth.usuario()?.id!==id)return;this.accept(response.data);this.loadedFor=id;this.mensaje.set(`Moneda de presentación: ${response.data.moneda}. Tus carteras conservan su propia moneda.`);},
      error:err=>{if(this.auth.usuario()?.id!==id)return;this.error.set(err?.error?.message||'No se pudo guardar la moneda. Tu configuración anterior se conserva.');},
    });
  }
  private accept(data:CurrencyPreferences){this.preferencias.set(data);this.auth.actualizarUsuarioLocal({moneda:currencyCode(data.moneda)});}
}
