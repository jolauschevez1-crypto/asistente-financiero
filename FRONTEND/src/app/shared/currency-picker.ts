import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CURRENCY_SYMBOLS, CurrencyService } from '../core/currency.service';

/**
 * Selector de moneda de cada módulo (arriba a la derecha). Elegir una moneda muestra todos los importes
 * convertidos con la tasa de referencia del BCE; lo guardado en cada cartera y el historial no cambian.
 */
@Component({
  selector: 'app-currency-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<label class="picker" [title]="'Mostrar importes en '+currency.presentacion()">
    <span class="sr-only">Moneda en la que ves los importes</span>
    <select [value]="currency.presentacion()" (change)="pick($any($event.target).value)" [disabled]="currency.guardando()">
      @for(c of currency.presentables();track c.codigo){<option [value]="c.codigo" [selected]="c.codigo===currency.presentacion()">{{c.codigo}} ({{symbol(c.codigo)}})</option>}
    </select>
    <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </label>`,
  styles: [`
    :host{display:inline-flex}
    .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
    .picker{position:relative;display:inline-flex;align-items:center}
    select{appearance:none;-webkit-appearance:none;min-height:48px;min-width:128px;padding:10px 44px 10px 22px;border:1px solid var(--af-picker-border);border-radius:999px;background:var(--af-picker-bg);color:var(--app-text-primary);font:inherit;font-size:.9375rem;font-weight:650;letter-spacing:.01em;cursor:pointer;box-shadow:0 0 0 4px var(--af-picker-ring),0 8px 24px var(--af-picker-glow);transition:border-color .15s ease,box-shadow .15s ease}
    select:hover:not(:disabled){border-color:var(--af-accent)}
    select:focus-visible{outline:3px solid var(--af-focus);outline-offset:3px}
    select:disabled{opacity:.6;cursor:progress}
    option{background:var(--app-bg-card);color:var(--app-text-primary)}
    .chevron{position:absolute;right:16px;width:18px;height:18px;pointer-events:none;color:var(--app-text-secondary)}
  `],
})
export class CurrencyPicker {
  readonly currency = inject(CurrencyService);
  symbol(code: string): string { return CURRENCY_SYMBOLS[code] || code; }
  pick(code: string){ if(code&&code!==this.currency.presentacion())this.currency.save(code); }
}
