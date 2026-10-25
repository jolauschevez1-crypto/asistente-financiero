import { QuickLoad } from '../../shared/quick-load';
import { DecimalInput } from '../../shared/decimal-input';
import { ChartCard } from '../../shared/chart-card/chart-card';
import { buildCategoriasOptions, buildIngresosVsGastosOptions } from '../../shared/chart-card/chart-builders';
import { Component, DestroyRef, ChangeDetectorRef, effect, inject, untracked } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, forkJoin } from 'rxjs';
import { FinanceService } from '../../core/finance.service';
import { CURRENCIES, CurrencyService, formatCurrency } from '../../core/currency.service';
import { AuthService } from '../../core/auth.service';
import { ITEM_NAME } from '../../core/input-validation';
import { compare, convert, ratio, scale, sum } from '../../core/money';
import { Budget, Category, Conversion, ConversionPreview, Debt, FinanceSection, Goal, Group, GroupDetail, HistoryEntry, Money, PanelData, Recurring, TransferPreview, Wallet } from '../../core/finance.models';

export function localDate(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function moneyIsValid(value: string, allowZero = false): boolean { return /^\d{1,9}(\.\d{1,2})?$/.test(value) && (allowZero ? Number(value)>=0 : Number(value)>0); }
type EntryForm = { nombre: string; monto: string; moneda: string; categoria_id: string; cuenta_id: string; tipo: string; frecuencia: string; fecha: string; contraparte: string; mes: string };
type ActionForm = { monto: string; cuenta_id: string; descripcion: string; correo: string; hacia_id: string; fecha: string };
type TransferForm = { origen_id: string; destino_id: string; monto: string; descripcion: string };
type ApiError = { status?: number; error?: { message?: string; code?: string } };
/** Importes de distintas monedas llevados a la moneda de presentación con la tasa vigente. */
export interface Estimate { total: string; sinTasa: { moneda: string; monto: string }[] }

@Component({selector: 'app-finance', imports: [CommonModule, FormsModule, RouterLink, CdkTrapFocus, ChartCard, DecimalInput, QuickLoad], templateUrl: './finance.html', styleUrl: './finance.css'})
export class FinancePage {
  readonly api = inject(FinanceService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);
  readonly moneda = inject(CurrencyService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly currencies = CURRENCIES;
  readonly namePattern = ITEM_NAME.source;
  section: FinanceSection = 'panel';
  month = localDate().slice(0,7);
  loading = false; busy = false; error = ''; notice = ''; formOpen = false;
  editingId: number | null = null;
  wallets: Wallet[] = []; categories: Category[] = []; budgets: Budget[] = [];
  recurring: Recurring[] = []; debts: Debt[] = []; goals: Goal[] = []; groups: Group[] = [];
  panel: PanelData | null = null; group: GroupDetail | null = null;
  selectedAction: {kind: 'abono' | 'aporte'; id: number; nombre: string; limite: Money; moneda: string; walletId?: number} | null = null;
  actionQuote: TransferPreview | null = null;
  history: HistoryEntry[] | null = null; historyTitle = ''; historyLoading = false;
  form: EntryForm = this.emptyForm();
  action: ActionForm = this.emptyAction();
  settlementAmount = '';
  transferOpen = false; transfer: TransferForm = this.emptyTransfer(); transferQuote: TransferPreview | null = null;
  conversionWallet: Wallet | null = null; conversionTarget = ''; conversionQuote: ConversionPreview | null = null; conversionAccepted = false; conversions: Conversion[] = [];
  confirmation: { message:string; proceed:()=>void } | null = null;
  confirmAction(){const action=this.confirmation?.proceed;this.confirmation=null;action?.();}
  private loadGeneration = 0;
  readonly titles: Record<FinanceSection, string> = {panel:'Panel general',carteras:'Mis carteras',presupuestos:'Presupuestos',recurrentes:'Ingresos y gastos fijos',deudas:'Deudas y cobros',metas:'Metas de ahorro',grupos:'Gastos compartidos'};
  readonly descriptions: Record<FinanceSection, string> = {
    panel:'Tu patrimonio en una sola moneda, con la tasa y la fecha a la vista.',carteras:'Cada cartera guarda su propia moneda. Transfiere o convierte cuando lo decidas.',
    presupuestos:'Define un límite por categoría y observa tus gastos del mes.',recurrentes:'Organiza tus vencimientos. Cada movimiento requiere tu confirmación.',
    deudas:'Lleva el control de lo que debes y de lo que te deben.',metas:'Ahorra para algo importante, con una cartera dedicada a cada meta.',
    grupos:'Comparte gastos con otras personas y lleva las cuentas claras.'};
  constructor(){
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data=>{this.section=data['section'];this.closeDialogs();this.group=null;this.error='';this.notice='';this.load();});
    // Al cambiar la moneda de presentación, el panel se vuelve a valorar en el servidor.
    let first=true;effect(()=>{this.moneda.presentacion();if(first){first=false;return;}untracked(()=>{if(this.section==='panel')this.load();});});
  }
  private closeDialogs(){this.formOpen=false;this.editingId=null;this.selectedAction=null;this.actionQuote=null;this.history=null;this.transferOpen=false;this.transferQuote=null;this.conversionWallet=null;this.conversionQuote=null;}
  private emptyForm(): EntryForm {return {nombre:'',monto:'',moneda:this.moneda.codigo(),categoria_id:'',cuenta_id:'',tipo:this.section==='deudas'?'PAGAR':'GASTO',frecuencia:'MENSUAL',fecha:localDate(),contraparte:'',mes:this.month};}
  private emptyAction(): ActionForm {return {monto:'',cuenta_id:'',descripcion:'',correo:'',hacia_id:'',fecha:localDate()};}
  private emptyTransfer(): TransferForm {return {origen_id:'',destino_id:'',monto:'',descripcion:''};}

  // ---- Formato y moneda -------------------------------------------------
  get base(): string {return this.panel?.moneda||this.moneda.presentacion();}
  /** Importe en la moneda indicada (por defecto, la de presentación). */
  fmt(value: Money | null | undefined, code?: string | null): string { return formatCurrency(value, code||this.base); }
  currencyName(code: string): string {return CURRENCIES.find(c=>c.codigo===code)?.nombre||code;}
  number(value: Money | null | undefined): number {return Number(value)||0;}
  date(value?: string | null): string {if(!value)return 'Sin fecha'; const text=value.slice(0,10);const p=text.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:text;}
  percent(value: Money): number { return Math.min(100,Math.max(0,Number(value)||0)); }
  walletById(id: number | string): Wallet | undefined {return this.wallets.find(w=>w.id===Number(id));}
  walletCurrency(id: number | string): string {return this.walletById(id)?.moneda||this.moneda.codigo();}
  /** Equivalente en la moneda de presentación con la tasa vigente; null si no hay tasa. */
  toBase(value: Money | null | undefined, code: string): string | null {
    if(value===null||value===undefined)return null;
    if(code===this.base)return sum([value]);
    return convert(value, this.panel?.tasas_a_base?.[code]);
  }
  estimate(items: {monto: Money; moneda: string}[]): Estimate {
    const parts: string[] = []; const missing = new Map<string, string[]>();
    for(const i of items){const v=this.toBase(i.monto,i.moneda);if(v===null)missing.set(i.moneda,[...(missing.get(i.moneda)||[]),String(i.monto)]);else parts.push(v);}
    return {total:sum(parts),sinTasa:[...missing].map(([moneda,list])=>({moneda,monto:sum(list)}))};
  }
  missingText(e: Estimate): string {return this.listText(e.sinTasa);}
  /** Lista importes de varias monedas sin sumarlos entre sí. */
  listText(list: {moneda: string; monto?: Money; saldo?: Money}[] | null | undefined): string {return (list||[]).map(x=>this.fmt(x.monto??x.saldo??0,x.moneda)).join(' · ');}
  codes(list: {moneda: string}[]): string {return list.map(x=>x.moneda).join(', ');}
  get rateLabel(): string {
    const t=this.panel?.tasas;if(!t||t.estado==='sin_tasa')return 'Sin tasas de referencia disponibles';
    const age=t.antiguedad_dias===0?'hoy':t.antiguedad_dias===1?'hace 1 día':`hace ${t.antiguedad_dias} días`;
    return `Tasas de referencia BCE del ${this.date(t.fecha_cotizacion)} (${age})`;
  }
  get multiCurrency(): boolean {return (this.panel?.saldos_por_moneda||[]).some(s=>s.moneda!==this.base);}
  alertText(alert: PanelData['alertas'][number]): string {return typeof alert==='string'?alert:(alert.mensaje||alert.descripcion||alert.nombre||'Hay un vencimiento pendiente.');}

  load(){
    const generation=++this.loadGeneration; this.loading=true; this.error='';
    const path=this.section==='panel'?`panel?mes=${this.month}&moneda=${this.moneda.presentacion()}`:this.section==='presupuestos'?`presupuestos?mes=${this.month}`:this.section;
    forkJoin({records:this.api.get<unknown>(path),wallets:this.api.get<Wallet[]>('carteras'),categories:this.api.get<Category[]>('categorias')}).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{if(generation===this.loadGeneration)this.loading=false;this.cdr.markForCheck();})).subscribe({next:r=>{
      if(generation!==this.loadGeneration)return;this.wallets=r.wallets;this.categories=r.categories;
      if(this.section==='panel'){this.panel=r.records as PanelData;this.trendOptions=this.buildTrend();this.categoryOptions=this.buildCategories();}
      if(this.section==='carteras')this.wallets=r.records as Wallet[];
      if(this.section==='presupuestos')this.budgets=r.records as Budget[];
      if(this.section==='recurrentes')this.recurring=r.records as Recurring[];
      if(this.section==='deudas')this.debts=r.records as Debt[];
      if(this.section==='metas')this.goals=r.records as Goal[];
      if(this.section==='grupos')this.groups=r.records as Group[];
    },error:e=>{if(generation===this.loadGeneration)this.showError(e);}});
  }
  readonly todayLabel = new Intl.DateTimeFormat('es-EC',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());

  // ---- Panel: estimaciones exactas en la moneda de presentación ----------
  private monthly(r: Recurring): string {return (r.frecuencia==='SEMANAL'?scale(r.monto,52,12):r.frecuencia==='ANUAL'?scale(r.monto,1,12):sum([r.monto]))||'0.00';}
  get liquid(): Estimate {const savings=new Set((this.panel?.metas||[]).map(g=>g.cuenta_id));return this.estimate((this.panel?.carteras||[]).filter(w=>!savings.has(w.id)).map(w=>({monto:w.saldo_actual,moneda:w.moneda})));}
  get dueFixed(): Recurring[] {return (this.panel?.recurrentes||[]).filter(r=>r.activo&&r.tipo==='GASTO'&&r.proxima_fecha.slice(0,7)<=this.month);}
  get payable(): Estimate {return this.estimate((this.panel?.deudas||[]).filter(d=>d.tipo==='PAGAR').map(d=>({monto:d.pendiente,moneda:d.moneda})));}
  get receivable(): Estimate {return this.estimate((this.panel?.deudas||[]).filter(d=>d.tipo==='COBRAR').map(d=>({monto:d.pendiente,moneda:d.moneda})));}
  get commitments(): Estimate {return this.estimate([...(this.panel?.deudas||[]).filter(d=>d.tipo==='PAGAR').map(d=>({monto:d.pendiente,moneda:d.moneda})),...this.dueFixed.map(r=>({monto:r.monto,moneda:r.moneda}))]);}
  minus(a: Money, b: Money): string {return sum([a,'-'+sum([b]).replace('-','')]);}
  get available(): string {return this.minus(this.liquid.total,this.commitments.total);}
  get availableIsNegative(): boolean {return compare(this.available,'0')<0;}
  get freePercent(): number {return compare(this.liquid.total,'0')>0?Math.max(0,Math.min(100,ratio(this.available,this.liquid.total))):0;}
  fixedMonthly(type: string): Estimate {return this.estimate((this.panel?.recurrentes||[]).filter(r=>r.activo&&r.tipo===type).map(r=>({monto:this.monthly(r),moneda:r.moneda})));}
  get fixedCategories(){const map=new Map<string,{monto:Money;moneda:string}[]>();for(const r of this.panel?.recurrentes||[]){if(r.activo&&r.tipo==='GASTO')map.set(r.categoria,[...(map.get(r.categoria)||[]),{monto:this.monthly(r),moneda:r.moneda}]);}return [...map].map(([name,items])=>({name,amount:this.estimate(items)}));}
  get projectedExpense(): string {const today=localDate();const days=new Date(Number(this.month.slice(0,4)),Number(this.month.slice(5,7)),0).getDate();const elapsed=this.month===today.slice(0,7)?Number(today.slice(8)):days;return scale(this.panel?.gastos||0,days,elapsed)||'0.00';}
  walletShare(w: Wallet): number {const v=this.toBase(w.saldo_actual,w.moneda);return v===null?0:this.percent(ratio(v,this.panel?.saldo_total));}
  isNegative(value: Money | null | undefined): boolean {return compare(value,'0')<0;}
  abs(value: Money): string {return sum([value]).replace('-','');}
  trendOptions = buildIngresosVsGastosOptions([]);
  categoryOptions = buildCategoriasOptions([]);
  private buildTrend(){return buildIngresosVsGastosOptions((this.panel?.tendencia||[]).map(t=>({mes:t.mes+'-01',ingresos:Number(t.ingresos),gastos:Number(t.gastos)})));}
  private buildCategories(){const data=(this.panel?.gastos_categoria||[]).map(c=>({categoria:c.categoria,cantidad:c.cantidad,monto_total:Number(c.monto_total)}));return {...buildCategoriasOptions(data),series:data.map(c=>c.monto_total)};}
  get trendIncomplete(): boolean {return (this.panel?.tendencia||[]).some(t=>!t.completo)||(this.panel?.gastos_categoria||[]).some(c=>c.sin_tasa.length>0);}
  setMonth(){if(/^\d{4}-\d{2}$/.test(this.month))this.load();}

  // ---- Formularios de alta y edición -----------------------------------
  /** Las monedas se eligen al crear: después quedan fijas (una cartera solo cambia con una conversión). */
  get asksCurrency(): boolean {return !this.editingId&&['carteras','presupuestos','deudas','metas','grupos'].includes(this.section);}
  get formCurrency(): string {return this.section==='recurrentes'?this.walletCurrency(this.form.cuenta_id):this.editingId?this.editingCurrency:this.form.moneda;}
  private editingCurrency = '';
  get formTitle(): string {return this.editingId?'Editar registro':({carteras:'Crear nueva cartera',presupuestos:'Nuevo presupuesto',recurrentes:'Nuevo recordatorio',deudas:'Nueva deuda o cobro',metas:'Nueva meta',grupos:'Nuevo grupo',panel:'Nuevo registro'} as Record<FinanceSection,string>)[this.section];}
  openForm(){this.closeDialogs();this.form=this.emptyForm();this.formOpen=true;this.error='';setTimeout(()=>document.getElementById('entry-first')?.focus());}
  cancelForm(){this.formOpen=false;this.editingId=null;}
  editBudget(b:Budget){this.closeDialogs();this.form={...this.emptyForm(),categoria_id:String(b.categoria_id),mes:b.mes.slice(0,7),monto:String(b.limite)};this.editingCurrency=b.moneda;this.editingId=b.id;this.formOpen=true;}
  editRecurring(r:Recurring){this.closeDialogs();this.form={...this.emptyForm(),nombre:r.nombre,tipo:r.tipo,monto:String(r.monto),categoria_id:String(r.categoria_id),cuenta_id:String(r.cuenta_id),frecuencia:r.frecuencia,fecha:r.proxima_fecha.slice(0,10)};this.editingCurrency=r.moneda;this.editingId=r.id;this.formOpen=true;}
  submit(form:NgForm){
    if(this.busy)return;this.error='';form.control.markAllAsTouched();if(form.invalid){this.error='Revisa los campos obligatorios y sus formatos.';return;}
    const f=this.form;const isGroup=this.section==='grupos';
    if(!isGroup&&!moneyIsValid(f.monto||'0',this.section==='carteras')){this.error='Escribe un importe válido con máximo dos decimales.';return;}
    if(this.section!=='presupuestos'&&f.nombre.trim().length<2){this.error='El nombre debe tener al menos 2 caracteres.';return;}
    if(this.section!=='presupuestos'&&!ITEM_NAME.test(f.nombre.trim())){this.error='El nombre solo admite letras, números, espacios y signos básicos.';return;}
    const moneda=this.asksCurrency?{moneda:f.moneda}:{};
    let data: Record<string,unknown>={};
    switch(this.section){
      case 'carteras':data={nombre:f.nombre.trim(),saldo_inicial:f.monto||'0',...moneda};break;
      case 'presupuestos':data=this.editingId?{limite:f.monto}:{categoria_id:Number(f.categoria_id),mes:f.mes,limite:f.monto,...moneda};break;
      case 'recurrentes':data={nombre:f.nombre.trim(),tipo:f.tipo,monto:f.monto,categoria_id:Number(f.categoria_id),cuenta_id:Number(f.cuenta_id),frecuencia:f.frecuencia,proxima_fecha:f.fecha};break;
      case 'deudas':data={nombre:f.nombre.trim(),contraparte:f.contraparte.trim(),tipo:f.tipo,monto:f.monto,...moneda,...(f.fecha?{fecha_vencimiento:f.fecha}:{})};break;
      case 'metas':data={nombre:f.nombre.trim(),objetivo:f.monto,...moneda,...(f.fecha?{fecha_objetivo:f.fecha}:{})};break;
      case 'grupos':data={nombre:f.nombre.trim(),...moneda};break;
      default:return;
    }
    const request=this.editingId?this.api.put(`${this.section}/${this.editingId}`,data):this.api.post(this.section,data);
    this.mutate(request,this.editingId?'Cambios guardados.':this.section==='carteras'?`Cartera creada en ${f.moneda}.`:'Registro creado.',()=>{this.cancelForm();});
  }
  private showError(e:unknown){ const err=e as ApiError;this.error=err.error?.message||(err.status===0?'No se pudo conectar con el servidor. Revisa tu conexión o el inicio del servidor local y vuelve a intentar.':'No se pudo completar la operación. Intenta nuevamente.');}
  private mutate(request:Observable<unknown>,message:string,done?:()=>void,failed?:(e:ApiError)=>void){
    this.busy=true;this.error='';this.notice='';
    request.pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.busy=false;this.cdr.markForCheck();})).subscribe({next:()=>{done?.();this.notice=message;this.load();},error:e=>{this.showError(e);failed?.(e as ApiError);}});
  }
  remove(kind:'presupuestos'|'recurrentes'|'deudas'|'metas',id:number,label:string){
    if(this.busy)return;const action=kind==='recurrentes'?'Desactivar':'Eliminar';
    this.confirmation={message:`${action} «${label}»? ${kind==='deudas'?'Solo se permite si no tiene abonos.':kind==='metas'?'Solo se permite sin saldo ni aportes. La cartera se conserva.':''}`,proceed:()=>this.mutate(this.api.delete(`${kind}/${id}`),`${action==='Desactivar'?'Recordatorio desactivado':'Registro eliminado'}.`)};
  }
  confirmRecurring(r:Recurring){if(this.busy||!r.vencido)return;this.confirmation={message:`Registrar ${r.tipo.toLowerCase()} de ${this.fmt(r.monto,r.moneda)} en «${r.cuenta}» por «${r.nombre}», con vencimiento ${this.date(r.proxima_fecha)}?`,proceed:()=>this.mutate(this.api.post(`recurrentes/${r.id}/confirmar`,{fecha_prevista:r.proxima_fecha.slice(0,10),confirmar:true}),'Movimiento registrado y próximo vencimiento actualizado.')};}

  // ---- Abonos y aportes --------------------------------------------------
  openMoneyAction(kind:'abono'|'aporte',item:Debt|Goal){
    this.closeDialogs();this.action=this.emptyAction();this.error='';
    this.selectedAction={kind,id:item.id,nombre:item.nombre,moneda:item.moneda,limite:kind==='abono'?(item as Debt).pendiente:(item as Goal).restante,walletId:kind==='aporte'?(item as Goal).cuenta_id:undefined};
  }
  /** Un abono solo admite carteras en la moneda de la deuda; un aporte puede convertir, con confirmación. */
  actionWallets():Wallet[]{const s=this.selectedAction;if(!s)return [];return this.wallets.filter(w=>w.id!==s.walletId&&(s.kind==='aporte'||w.moneda===s.moneda));}
  get actionCurrency(): string {return this.action.cuenta_id?this.walletCurrency(this.action.cuenta_id):this.selectedAction?.moneda||this.base;}
  get actionNeedsQuote(): boolean {return !!this.selectedAction&&this.selectedAction.kind==='aporte'&&!!this.action.cuenta_id&&this.actionCurrency!==this.selectedAction.moneda;}
  resetActionQuote(){this.actionQuote=null;}
  /** Keep the same key on network errors and page reloads, until the server confirms success. */
  operationKey(path:string,payload:unknown):{storage:string;key:string}{
    const storage=`af_pending:${this.auth.usuario()?.id}:${path}:${JSON.stringify(payload)}`;
    const current=sessionStorage.getItem(storage);const key=current||crypto.randomUUID();if(!current)sessionStorage.setItem(storage,key);return {storage,key};
  }
  submitMoneyAction(form:NgForm){
    if(this.busy||!this.selectedAction)return;form.control.markAllAsTouched();if(form.invalid||!moneyIsValid(this.action.monto)){this.error='Selecciona una cartera y un importe válido mayor que cero.';return;}
    const selected=this.selectedAction;
    if(!this.actionNeedsQuote&&compare(this.action.monto,selected.limite)>0){this.error='El importe supera el saldo pendiente.';return;}
    if(this.actionNeedsQuote&&!this.actionQuote){this.quoteAction();return;}
    const path=`${selected.kind==='abono'?'deudas':'metas'}/${selected.id}/${selected.kind==='abono'?'abonos':'aportes'}`;
    const data={monto:this.action.monto,cuenta_id:Number(this.action.cuenta_id)};const operation=this.operationKey(path,data);
    const confirmation=this.actionQuote?.cotizacion?{confirmar:true,tasa:this.actionQuote.cotizacion.tasa}:{};
    this.mutate(this.api.post(path,{...data,...confirmation,idempotencia:operation.key}),selected.kind==='abono'?'Abono registrado en la cartera seleccionada.':'Aporte transferido a la cartera de ahorro.',()=>{sessionStorage.removeItem(operation.storage);this.selectedAction=null;this.actionQuote=null;this.history=null;},e=>{if(e.error?.code==='TASA_CAMBIADA')this.quoteAction();});
  }
  quoteAction(){
    const s=this.selectedAction;if(!s?.walletId||this.busy)return;this.busy=true;
    this.api.post<TransferPreview>('transferencias/preview',{origen_id:Number(this.action.cuenta_id),destino_id:s.walletId,monto:this.action.monto}).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.busy=false;this.cdr.markForCheck();})).subscribe({next:q=>this.actionQuote=q,error:e=>this.showError(e)});
  }
  showHistory(kind:'deudas'|'metas',id:number,name:string){this.historyTitle=`${kind==='deudas'?'Abonos':'Aportes'} · ${name}`;this.history=null;this.historyLoading=true;this.api.get<HistoryEntry[]>(`${kind}/${id}/${kind==='deudas'?'abonos':'aportes'}`).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.historyLoading=false;this.cdr.markForCheck();})).subscribe({next:r=>this.history=r,error:e=>this.showError(e)});}

  // ---- Transferencias entre carteras ------------------------------------
  openTransfer(origin?: Wallet){this.closeDialogs();this.transfer={...this.emptyTransfer(),origen_id:origin?String(origin.id):''};this.transferOpen=true;this.error='';}
  get transferCurrencies(): {from: string; to: string} {return {from:this.walletCurrency(this.transfer.origen_id),to:this.walletCurrency(this.transfer.destino_id)};}
  get transferConverts(): boolean {return !!this.transfer.origen_id&&!!this.transfer.destino_id&&this.transferCurrencies.from!==this.transferCurrencies.to;}
  resetTransferQuote(){this.transferQuote=null;}
  submitTransfer(form:NgForm){
    if(this.busy)return;form.control.markAllAsTouched();this.error='';
    if(form.invalid||!moneyIsValid(this.transfer.monto)){this.error='Elige las dos carteras y un importe mayor que cero con hasta dos decimales.';return;}
    if(this.transfer.origen_id===this.transfer.destino_id){this.error='La cartera de destino debe ser diferente a la de origen.';return;}
    const data={origen_id:Number(this.transfer.origen_id),destino_id:Number(this.transfer.destino_id),monto:this.transfer.monto,...(this.transfer.descripcion.trim()?{descripcion:this.transfer.descripcion.trim()}:{})};
    if(this.transferConverts&&!this.transferQuote){this.quoteTransfer(data);return;}
    const operation=this.operationKey('transferencias',data);
    const confirmation=this.transferQuote?.cotizacion?{confirmar:true,tasa:this.transferQuote.cotizacion.tasa}:{};
    this.mutate(this.api.post('transferencias',{...data,...confirmation,idempotencia:operation.key}),'Transferencia registrada.',()=>{sessionStorage.removeItem(operation.storage);this.transferOpen=false;this.transferQuote=null;},e=>{if(e.error?.code==='TASA_CAMBIADA')this.quoteTransfer(data);});
  }
  private quoteTransfer(data: Record<string,unknown>){
    this.busy=true;this.api.post<TransferPreview>('transferencias/preview',data).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.busy=false;this.cdr.markForCheck();})).subscribe({next:q=>this.transferQuote=q,error:e=>this.showError(e)});
  }

  // ---- Conversión explícita de una cartera -----------------------------
  conversionTargets(): readonly {codigo: string; nombre: string}[] {return this.moneda.presentables().filter(c=>c.codigo!==this.conversionWallet?.moneda);}
  openConversion(w: Wallet){
    this.closeDialogs();this.conversionWallet=w;this.conversionTarget=this.conversionTargets()[0]?.codigo||'';this.conversionAccepted=false;this.conversions=[];this.error='';
    this.api.get<Conversion[]>(`carteras/${w.id}/conversiones`).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.cdr.markForCheck())).subscribe({next:r=>this.conversions=r,error:()=>{}});
  }
  quoteConversion(){
    const w=this.conversionWallet;if(!w||!this.conversionTarget||this.busy)return;this.busy=true;this.error='';this.conversionQuote=null;this.conversionAccepted=false;
    this.api.get<ConversionPreview>(`carteras/${w.id}/conversion?moneda=${encodeURIComponent(this.conversionTarget)}`).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.busy=false;this.cdr.markForCheck();})).subscribe({next:q=>this.conversionQuote=q,error:e=>this.showError(e)});
  }
  confirmConversion(){
    const w=this.conversionWallet,q=this.conversionQuote;if(!w||!q||!this.conversionAccepted||this.busy)return;
    const data={moneda_destino:q.moneda_destino};const operation=this.operationKey(`carteras/${w.id}/conversion`,data);
    this.mutate(this.api.post(`carteras/${w.id}/conversion`,{...data,tasa:q.cotizacion.tasa,confirmar:true,idempotencia:operation.key}),`«${w.nombre}» ahora está en ${q.moneda_destino}. El historial anterior se conserva en ${q.moneda_origen}.`,
      ()=>{sessionStorage.removeItem(operation.storage);this.conversionWallet=null;this.conversionQuote=null;},e=>{if(e.error?.code==='TASA_CAMBIADA')this.quoteConversion();});
  }

  // ---- Grupos ------------------------------------------------------------
  openGroup(id:number){this.error='';this.loading=true;this.api.get<GroupDetail>(`grupos/${id}`).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.loading=false;this.cdr.markForCheck();})).subscribe({next:r=>{this.group=r;this.action=this.emptyAction();this.settlementAmount='';},error:e=>this.showError(e)});}
  memberName(id:number){return this.group?.miembros.find(m=>m.id===id)?.nombre||'Miembro';}
  get groupCurrency(): string {return this.group?.grupo.moneda||this.base;}
  get myGroupBalance(){return Number(this.group?.miembros.find(m=>m.id===this.auth.usuario()?.id)?.saldo||0);}
  get groupCreditors(){return this.group?.miembros.filter(m=>Number(m.saldo)>0&&m.id!==this.auth.usuario()?.id)||[];}
  private groupMutation(path:string,data:Record<string,unknown>,message:string,idempotent=false){
    if(!this.group)return;const groupId=this.group.grupo.id;const endpoint=`grupos/${groupId}/${path}`;const operation=idempotent?this.operationKey(endpoint,data):null;
    this.mutate(this.api.post(endpoint,{...data,...(operation?{idempotencia:operation.key}:{})}),message,()=>{if(operation)sessionStorage.removeItem(operation.storage);this.openGroup(groupId);});
  }
  addMember(form:NgForm){if(this.busy)return;form.control.markAllAsTouched();if(form.invalid)return;this.groupMutation('miembros',{correo:this.action.correo.trim().toLowerCase()},'Persona agregada al grupo.');}
  addExpense(form:NgForm){if(this.busy)return;form.control.markAllAsTouched();if(form.invalid||!moneyIsValid(this.action.monto)||this.action.descripcion.trim().length<2){this.error='Revisa la descripción, la fecha y el importe del gasto.';return;}this.groupMutation('gastos',{descripcion:this.action.descripcion.trim(),monto:this.action.monto,fecha:this.action.fecha},'Gasto compartido registrado y repartido.',true);}
  settle(form:NgForm){if(this.busy)return;form.control.markAllAsTouched();if(form.invalid||!moneyIsValid(this.settlementAmount)){this.error='Selecciona una persona e indica un importe válido.';return;}this.confirmation={message:'Confirma que ya realizaste este pago por tu cuenta. Aquí solo quedará constancia: no se mueve dinero de tus carteras.',proceed:()=>this.groupMutation('liquidaciones',{hacia_id:Number(this.action.hacia_id),monto:this.settlementAmount,confirmar:true},'Liquidación registrada en el grupo.',true)};}
}
