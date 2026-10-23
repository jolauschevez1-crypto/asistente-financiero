import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { CurrencyService } from '../../core/currency.service';

@Component({
  selector:'app-currency-settings',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
  template:`
    <section class="currency-settings" aria-label="Moneda de tu cuenta">
      <h2>Moneda de tu cuenta</h2>
      <p>Elige la moneda en la que registras tus finanzas. Esta opción no convierte importes ni utiliza tipos de cambio.</p>
      @if(currency.cargando()){<p role="status">Consultando preferencia…</p>}
      <label>País o moneda
        <select [value]="selected()" (change)="selected.set($any($event.target).value)" [disabled]="currency.cargando()||currency.guardando()||currency.preferencias()?.puede_cambiar===false">
          @for(option of currency.opciones;track option.codigo){<option [value]="option.codigo">{{option.region}} · {{option.codigo}} — {{option.nombre}}</option>}
        </select>
      </label>
      @if(currency.preferencias();as preferences){<p class="rule">{{preferences.motivo || 'Puedes cambiar la moneda antes de registrar actividad financiera.'}}</p>}
      <p class="rule">Después de registrar actividad financiera, la moneda queda fija para conservar el significado de tus saldos e historial.</p>
      <div class="actions"><button type="button" (click)="currency.save(selected())" [disabled]="currency.cargando()||currency.guardando()||!currency.preferencias()||currency.preferencias()?.puede_cambiar===false||selected()===currency.codigo()">{{currency.guardando()?'Guardando…':'Guardar moneda'}}</button><button type="button" class="secondary" (click)="currency.load(true)" [disabled]="currency.cargando()||currency.guardando()">Actualizar</button></div>
      @if(currency.error()){<p class="feedback error" role="alert">{{currency.error()}}</p>}
      @if(currency.mensaje()){<p class="feedback success" role="status">{{currency.mensaje()}}</p>}
    </section>
  `,
  styles:`:host{display:block}.currency-settings{max-width:620px;color:var(--app-text-primary);font-size:.86rem}.currency-settings h2{font-size:1.1rem;margin:0 0 10px}.currency-settings p{line-height:1.6;margin:8px 0 16px;color:var(--app-text-secondary)}label{display:flex;flex-direction:column;gap:8px;font-weight:650}select{font:inherit;min-height:44px;padding:10px 12px;width:100%;border:1px solid var(--af-border);border-radius:8px;background:var(--af-input);color:var(--app-text-primary)}.rule{font-size:.79rem}.actions{display:flex;gap:10px;flex-wrap:wrap}button{cursor:pointer;min-height:42px;padding:10px 16px;font:inherit;font-weight:650;border:1px solid var(--af-accent);border-radius:8px;background:var(--af-accent);color:var(--af-on-accent)}button.secondary{color:var(--app-text-primary);background:transparent;border-color:var(--af-border)}button:disabled,select:disabled{opacity:.65;cursor:not-allowed}.feedback{border:1px solid;padding:12px;border-radius:8px}.feedback.error{color:var(--af-danger);background:var(--af-danger-soft)}.feedback.success{color:var(--af-accent);background:var(--af-accent-soft)}`,
})
export class CurrencySettings implements OnInit {
  readonly currency=inject(CurrencyService);
  readonly selected=signal<string>(this.currency.codigo());
  constructor(){effect(()=>this.selected.set(this.currency.codigo()));}
  ngOnInit(){this.currency.load(true);}
}
