import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { finalize } from 'rxjs';
import { FinanceService } from '../core/finance.service';
import { CurrencyService } from '../core/currency.service';
import { AuthService } from '../core/auth.service';
import { Wallet } from '../core/finance.models';
import { sum } from '../core/money';

@Component({selector:'app-quick-load',imports:[FormsModule,CdkTrapFocus],template:`
<button type="button" class="quick-trigger" (click)="open()">Carga rápida</button>
@if(opened){<div class="quick-overlay"><section class="quick-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-title" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="!busy && close()">
 <header><div><span class="quick-kicker">Varios gastos de una vez</span><h2 id="quick-title">Carga rápida</h2></div><button type="button" aria-label="Cerrar carga rápida" (click)="close()" [disabled]="busy">×</button></header>
 <p>Escribe varios gastos separados por coma o por línea. Usa punto para decimales y <strong>k</strong> para miles.</p>
 @if(error){<p class="quick-error" role="alert">{{error}}</p>}
 <label>Gastos<textarea [(ngModel)]="text" (ngModelChange)="preview=[]" maxlength="4000" rows="4" placeholder="Supermercado 42, café 2.50, gasolina 20" [disabled]="busy"></textarea></label>
 <label>Cartera<select [(ngModel)]="wallet" [disabled]="busy"><option value="">Selecciona una cartera</option>@for(w of wallets;track w.id){<option [value]="w.id">{{w.nombre}} · {{currency.format(w.saldo_actual,w.moneda)}}</option>}</select></label>
 @if(preview.length){<div class="quick-preview"><h3>Revisa antes de guardar</h3>@for(e of preview;track $index){<div><span>{{e.descripcion}}</span><strong class="num">{{currency.format(e.monto,walletCurrency)}}</strong></div>}<div class="quick-total"><span>{{preview.length}} gastos · Total</span><strong class="num">{{currency.format(total,walletCurrency)}}</strong></div><small>Se guardarán en {{walletCurrency}}, en la categoría Otros. Todos se registran juntos.</small></div>}
 <footer><button type="button" class="quick-cancel" (click)="close()" [disabled]="busy">Cancelar</button><button type="button" class="quick-primary" (click)="preview.length?save():review()" [disabled]="busy||!text.trim()||!wallet">{{busy?'Procesando…':preview.length?'Confirmar gastos':'Revisar gastos'}}</button></footer>
 </section></div>}
`,styleUrl:'./quick-load.css'})
export class QuickLoad {
 private readonly cdr=inject(ChangeDetectorRef);
 private readonly api=inject(FinanceService);private readonly auth=inject(AuthService);readonly currency=inject(CurrencyService);
 @Output() saved=new EventEmitter<void>();
 opened=false;busy=false;error='';text='';wallet='';wallets:Wallet[]=[];preview:{descripcion:string;monto:string}[]=[];
 get total(){return sum(this.preview.map(e=>e.monto));}
 get walletCurrency(){return this.wallets.find(w=>String(w.id)===String(this.wallet))?.moneda||this.currency.codigo();}
 open(){this.opened=true;this.error='';this.api.get<Wallet[]>('carteras').pipe(finalize(()=>this.cdr.markForCheck())).subscribe({next:w=>this.wallets=w,error:()=>this.error='No se pudieron cargar las carteras.'});}
 close(){if(!this.busy)this.opened=false;}
 review(){if(this.busy)return;this.busy=true;this.error='';this.api.post<{descripcion:string;monto:string}[]>('carga-rapida/preview',{texto:this.text}).pipe(finalize(()=>{this.busy=false;this.cdr.markForCheck();})).subscribe({next:p=>this.preview=p,error:e=>this.error=e?.error?.message||'No se pudo revisar la carga.'});}
 save(){if(this.busy||!this.preview.length||!this.wallet)return;this.busy=true;this.error='';
  const storage='af_quick:'+this.auth.usuario()?.id+':'+JSON.stringify([this.text,this.wallet]);const key=sessionStorage.getItem(storage)||crypto.randomUUID();sessionStorage.setItem(storage,key);
  this.api.post('carga-rapida',{texto:this.text,cuenta_id:Number(this.wallet),idempotencia:key}).pipe(finalize(()=>{this.busy=false;this.cdr.markForCheck();})).subscribe({next:()=>{sessionStorage.removeItem(storage);this.opened=false;this.text='';this.preview=[];this.saved.emit();},error:e=>this.error=e?.error?.message||'No se pudo confirmar. Puedes reintentar sin duplicar gastos.'});
 }
}
