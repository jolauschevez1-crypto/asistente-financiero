import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { CurrencyService } from '../../core/currency.service';

@Component({
  selector:'app-currency-settings',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
  template:`
    <section class="currency-settings" aria-label="Moneda de presentación">
      <h2>Moneda de presentación</h2>
      <p>Es la moneda en la que ves el panel consolidado. Cada cartera conserva su propia moneda: cambiar esta opción no modifica saldos ni historial.</p>
      @if(currency.cargando()){<p role="status">Consultando preferencia…</p>}
      <label>Moneda
        <select [value]="selected()" (change)="selected.set($any($event.target).value)" [disabled]="currency.cargando()||currency.guardando()">
          @for(option of currency.presentables();track option.codigo){<option [value]="option.codigo">{{option.codigo}} · {{option.nombre}}</option>}
        </select>
      </label>
      <p class="rule">Las conversiones usan tasas de referencia del Banco Central Europeo, publicadas una vez por día hábil. No son tasas en tiempo real ni de una casa de cambio.</p>
      <div class="actions"><button type="button" (click)="currency.save(selected())" [disabled]="currency.cargando()||currency.guardando()||selected()===currency.codigo()">{{currency.guardando()?'Guardando…':'Guardar moneda'}}</button><button type="button" class="secondary" (click)="currency.load(true)" [disabled]="currency.cargando()||currency.guardando()">Actualizar</button></div>
      @if(currency.error()){<p class="feedback error" role="alert">{{currency.error()}}</p>}
      @if(currency.mensaje()){<p class="feedback success" role="status">{{currency.mensaje()}}</p>}
    </section>
  `,
  styles:`:host{display:block}.currency-settings{max-width:620px;color:var(--app-text-primary);font-size:.875rem}.currency-settings h2{font-size:1.0625rem;font-weight:650;margin:0 0 8px}.currency-settings p{line-height:1.55;margin:8px 0 16px;color:var(--af-muted)}label{display:flex;flex-direction:column;gap:6px;font-size:.8125rem;font-weight:650}select{font:inherit;font-size:.9375rem;min-height:44px;padding:10px 12px;width:100%;border:1px solid var(--af-border-strong);border-radius:10px;background:var(--af-input);color:var(--app-text-primary)}.rule{font-size:.8125rem}.actions{display:flex;gap:8px;flex-wrap:wrap}button{cursor:pointer;min-height:44px;padding:10px 18px;font:inherit;font-size:.875rem;font-weight:650;border:1px solid transparent;border-radius:999px;background:var(--af-primary-bg);color:var(--af-primary-text)}button:hover:not(:disabled){background:var(--af-primary-hover)}button.secondary{color:var(--app-text-primary);background:transparent;border-color:var(--af-border-strong)}button.secondary:hover:not(:disabled){background:var(--af-soft)}button:disabled,select:disabled{opacity:.5;cursor:not-allowed}.feedback{border:1px solid;padding:12px 16px;border-radius:12px}.feedback.error{color:var(--af-danger);background:var(--af-danger-soft)}.feedback.success{color:var(--af-accent);background:var(--af-accent-soft)}`,
})
export class CurrencySettings implements OnInit {
  readonly currency=inject(CurrencyService);
  readonly selected=signal<string>(this.currency.codigo());
  constructor(){effect(()=>this.selected.set(this.currency.codigo()));}
  ngOnInit(){this.currency.load(true);}
}
