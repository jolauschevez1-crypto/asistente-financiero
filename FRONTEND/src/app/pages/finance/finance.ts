import { QuickLoad } from '../../shared/quick-load';
import { DecimalInput } from '../../shared/decimal-input';
import { ApiService } from '../../core/api.service';
import { Movimiento } from '../../core/models';
import { ChartCard } from '../../shared/chart-card/chart-card';
import { buildCategoriasOptions, buildIngresosVsGastosOptions } from '../../shared/chart-card/chart-builders';
import { Component, DestroyRef, ChangeDetectorRef, inject } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, forkJoin } from 'rxjs';
import { FinanceService } from '../../core/finance.service';
import { CurrencyService } from '../../core/currency.service';
import { AuthService } from '../../core/auth.service';
import { Budget, Category, Debt, FinanceSection, Goal, Group, GroupDetail, HistoryEntry, Money, PanelData, Recurring, Wallet } from '../../core/finance.models';

export function localDate(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function moneyIsValid(value: string, allowZero = false): boolean { return /^\d{1,9}(\.\d{1,2})?$/.test(value) && (allowZero ? Number(value)>=0 : Number(value)>0); }
type EntryForm = { nombre: string; monto: string; categoria_id: string; cuenta_id: string; tipo: string; frecuencia: string; fecha: string; contraparte: string; mes: string };
type ActionForm = { monto: string; cuenta_id: string; descripcion: string; correo: string; hacia_id: string; fecha: string };

@Component({selector: 'app-finance', imports: [CommonModule, FormsModule, RouterLink, CdkTrapFocus, ChartCard, DecimalInput, QuickLoad], templateUrl: './finance.html', styleUrl: './finance.css'})
export class FinancePage {
  readonly api = inject(FinanceService);
  private readonly movementApi = inject(ApiService);
  movements: Movimiento[] = [];
  private readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);
  readonly moneda = inject(CurrencyService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  section: FinanceSection = 'panel';
  month = localDate().slice(0,7);
  loading = false; busy = false; error = ''; notice = ''; formOpen = false;
  editingId: number | null = null;
  wallets: Wallet[] = []; categories: Category[] = []; budgets: Budget[] = [];
  recurring: Recurring[] = []; debts: Debt[] = []; goals: Goal[] = []; groups: Group[] = [];
  panel: PanelData | null = null; group: GroupDetail | null = null;
  selectedAction: {kind: 'abono' | 'aporte'; id: number; nombre: string; limite: Money; walletId?: number} | null = null;
  history: HistoryEntry[] | null = null; historyTitle = ''; historyLoading = false;
  form: EntryForm = this.emptyForm();
  action: ActionForm = this.emptyAction();
  settlementAmount = '';
  confirmation: { message:string; proceed:()=>void } | null = null;
  confirmAction(){const action=this.confirmation?.proceed;this.confirmation=null;action?.();}
  private loadGeneration = 0;
  readonly titles: Record<FinanceSection, string> = {panel:'Panel general',carteras:'Mis carteras',presupuestos:'Presupuestos',recurrentes:'Ingresos y gastos fijos',deudas:'Deudas y cobros',metas:'Metas de ahorro',grupos:'Gastos compartidos'};
  readonly descriptions: Record<FinanceSection, string> = {
    panel:'Todo lo que necesitas para decidir tu siguiente paso.',carteras:'Separa tu dinero y conoce el saldo de cada cuenta.',
    presupuestos:'Define un límite por categoría y observa tus gastos del mes.',recurrentes:'Organiza tus vencimientos. Cada movimiento requiere tu confirmación.',
    deudas:'Lleva el control de lo que debes y de lo que te deben.',metas:'Ahorra para algo importante, con una cartera dedicada a cada meta.',
    grupos:'Comparte gastos con otras personas y lleva las cuentas claras.'};
  constructor(){ this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data=>{this.section=data['section'];this.formOpen=false;this.editingId=null;this.selectedAction=null;this.history=null;this.group=null;this.error='';this.notice='';this.load();}); }
  private emptyForm(): EntryForm {return {nombre:'',monto:'',categoria_id:'',cuenta_id:'',tipo:this.section==='deudas'?'PAGAR':'GASTO',frecuencia:'MENSUAL',fecha:localDate(),contraparte:'',mes:this.month};}
  private emptyAction(): ActionForm {return {monto:'',cuenta_id:'',descripcion:'',correo:'',hacia_id:'',fecha:localDate()};}
  currency(value: Money | null | undefined): string { return this.moneda.format(value); }
  number(value: Money | null | undefined): number {return Number(value)||0;}
  date(value?: string): string {if(!value)return 'Sin fecha'; const text=value.slice(0,10);const p=text.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:text;}
  percent(value: Money): number { return Math.min(100,Math.max(0,Number(value)||0)); }
  alertText(alert: PanelData['alertas'][number]): string {return typeof alert==='string'?alert:(alert.mensaje||alert.descripcion||alert.nombre||'Hay un vencimiento pendiente.');}
  load(){
    const generation=++this.loadGeneration; this.loading=true; this.error='';
    const path=this.section==='panel'?`panel?mes=${this.month}`:this.section==='presupuestos'?`presupuestos?mes=${this.month}`:this.section;
    forkJoin({records:this.api.get<unknown>(path),wallets:this.api.get<Wallet[]>('carteras'),categories:this.api.get<Category[]>('categorias'),movements:this.movementApi.listarMisMovimientos()}).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{if(generation===this.loadGeneration)this.loading=false;this.cdr.markForCheck();})).subscribe({next:r=>{
      if(generation!==this.loadGeneration)return;this.wallets=r.wallets;this.categories=r.categories;this.movements=r.movements;this.trendOptions=this.buildTrend();this.categoryOptions=this.buildCategories();
      if(this.section==='panel')this.panel=r.records as PanelData;
      if(this.section==='carteras')this.wallets=r.records as Wallet[];
      if(this.section==='presupuestos')this.budgets=r.records as Budget[];
      if(this.section==='recurrentes')this.recurring=r.records as Recurring[];
      if(this.section==='deudas')this.debts=r.records as Debt[];
      if(this.section==='metas')this.goals=r.records as Goal[];
      if(this.section==='grupos')this.groups=r.records as Group[];
    },error:e=>{if(generation===this.loadGeneration)this.showError(e);}});
  }
  readonly todayLabel = new Intl.DateTimeFormat('es-EC',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  get liquidBalance(){const savings=new Set((this.panel?.metas||[]).map(g=>g.cuenta_id));return (this.panel?.carteras||[]).filter(w=>!savings.has(w.id)).reduce((sum,w)=>sum+Number(w.saldo_actual),0);}
  get dueFixed(){return (this.panel?.recurrentes||[]).filter(r=>r.activo&&r.tipo==='GASTO'&&r.proxima_fecha.slice(0,7)<=this.month);}
  get commitments(){return this.payable+this.dueFixed.reduce((sum,r)=>sum+Number(r.monto),0);}
  get available(){return this.liquidBalance-this.commitments;}
  get freePercent(){return this.liquidBalance>0?Math.max(0,Math.min(100,this.available/this.liquidBalance*100)):0;}
  get fixedCategories(){const map=new Map<string,number>();for(const r of this.panel?.recurrentes||[]){if(r.activo&&r.tipo==='GASTO'){map.set(r.categoria,(map.get(r.categoria)||0)+Number(r.monto)*(r.frecuencia==='SEMANAL'?52/12:r.frecuencia==='ANUAL'?1/12:1));}}return [...map].map(([name,amount])=>({name,amount}));}
  get payable(): number {return (this.panel?.deudas || []).filter(d=>d.tipo==='PAGAR').reduce((n,d)=>n+Number(d.pendiente),0);}
  get receivable(): number {return (this.panel?.deudas || []).filter(d=>d.tipo==='COBRAR').reduce((n,d)=>n+Number(d.pendiente),0);}
  fixedMonthly(type:string): number {return (this.panel?.recurrentes || []).filter(r=>r.activo&&r.tipo===type).reduce((n,r)=>n+Number(r.monto)*(r.frecuencia==='SEMANAL'?52/12:r.frecuencia==='ANUAL'?1/12:1),0);}
  get projectedExpense(): number {const today=localDate();const days=new Date(Number(this.month.slice(0,4)),Number(this.month.slice(5,7)),0).getDate();const elapsed=this.month===today.slice(0,7)?Number(today.slice(8)):days;return Number(this.panel?.gastos||0)/elapsed*days;}
  trendOptions = buildIngresosVsGastosOptions([]);
  categoryOptions = buildCategoriasOptions([]);
  private buildTrend(){const months=new Map<string,{mes:string;ingresos:number;gastos:number}>();for(const m of this.movements){if(!m.fecha)continue;const key=m.fecha.slice(0,7);if(key>this.month)continue;const row=months.get(key)||{mes:key+'-01',ingresos:0,gastos:0};if(m.tipo==='INGRESO')row.ingresos+=Number(m.monto);if(m.tipo==='GASTO')row.gastos+=Number(m.monto);months.set(key,row);}return buildIngresosVsGastosOptions([...months.values()].sort((a,b)=>a.mes.localeCompare(b.mes)).slice(-6));}
  private buildCategories(){const cats=new Map<string,{categoria:string;cantidad:number;monto_total:number}>();for(const m of this.movements){if(m.tipo!=='GASTO'||m.fecha?.slice(0,7)!==this.month)continue;const key=m.categoria||'Otros';const row=cats.get(key)||{categoria:key,cantidad:0,monto_total:0};row.cantidad++;row.monto_total+=Number(m.monto);cats.set(key,row);}const data=[...cats.values()];return {...buildCategoriasOptions(data),series:data.map(c=>c.monto_total)};}
  setMonth(){if(/^\d{4}-\d{2}$/.test(this.month))this.load();}
  openForm(){this.editingId=null;this.form=this.emptyForm();this.formOpen=true;this.error='';setTimeout(()=>document.getElementById('entry-first')?.focus());}
  cancelForm(){this.formOpen=false;this.editingId=null;}
  editBudget(b:Budget){this.form={...this.emptyForm(),categoria_id:String(b.categoria_id),mes:b.mes.slice(0,7),monto:String(b.limite)};this.editingId=b.id;this.formOpen=true;}
  editRecurring(r:Recurring){this.form={...this.emptyForm(),nombre:r.nombre,tipo:r.tipo,monto:String(r.monto),categoria_id:String(r.categoria_id),cuenta_id:String(r.cuenta_id),frecuencia:r.frecuencia,fecha:r.proxima_fecha.slice(0,10)};this.editingId=r.id;this.formOpen=true;}
  submit(form:NgForm){
    if(this.busy)return;this.error='';form.control.markAllAsTouched();if(form.invalid){this.error='Revisa los campos obligatorios y sus formatos.';return;}
    const f=this.form;const isGroup=this.section==='grupos';
    if(!isGroup&&!moneyIsValid(f.monto||'0',this.section==='carteras')){this.error='Escribe un importe válido con máximo dos decimales.';return;}
    if(this.section!=='presupuestos'&&f.nombre.trim().length<2){this.error='El nombre debe tener al menos 2 caracteres.';return;}
    let data: Record<string,unknown>={};
    switch(this.section){
      case 'carteras':data={nombre:f.nombre.trim(),saldo_inicial:f.monto||'0'};break;
      case 'presupuestos':data=this.editingId?{limite:f.monto}:{categoria_id:Number(f.categoria_id),mes:f.mes,limite:f.monto};break;
      case 'recurrentes':data={nombre:f.nombre.trim(),tipo:f.tipo,monto:f.monto,categoria_id:Number(f.categoria_id),cuenta_id:Number(f.cuenta_id),frecuencia:f.frecuencia,proxima_fecha:f.fecha};break;
      case 'deudas':data={nombre:f.nombre.trim(),contraparte:f.contraparte.trim(),tipo:f.tipo,monto:f.monto,...(f.fecha?{fecha_vencimiento:f.fecha}:{})};break;
      case 'metas':data={nombre:f.nombre.trim(),objetivo:f.monto,...(f.fecha?{fecha_objetivo:f.fecha}:{})};break;
      case 'grupos':data={nombre:f.nombre.trim()};break;
      default:return;
    }
    const request=this.editingId?this.api.put(`${this.section}/${this.editingId}`,data):this.api.post(this.section,data);
    this.mutate(request,this.editingId?'Cambios guardados.':'Registro creado.',()=>{this.cancelForm();});
  }
  private showError(e:unknown){ const err=e as {status?:number;error?:{message?:string}};this.error=err.error?.message||(err.status===0?'No se pudo conectar con el servidor. Revisa tu conexión o el inicio del servidor local y vuelve a intentar.':'No se pudo completar la operación. Intenta nuevamente.');}
  private mutate(request:Observable<unknown>,message:string,done?:()=>void){
    this.busy=true;this.error='';this.notice='';
    request.pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.busy=false;this.cdr.markForCheck();})).subscribe({next:()=>{done?.();this.notice=message;this.load();},error:e=>this.showError(e)});
  }
  remove(kind:'presupuestos'|'recurrentes'|'deudas'|'metas',id:number,label:string){
    if(this.busy)return;const action=kind==='recurrentes'?'Desactivar':'Eliminar';
    this.confirmation={message:`${action} «${label}»? ${kind==='deudas'?'Solo se permite si no tiene abonos.':kind==='metas'?'Solo se permite sin saldo ni aportes. La cartera se conserva.':''}`,proceed:()=>this.mutate(this.api.delete(`${kind}/${id}`),`${action==='Desactivar'?'Recordatorio desactivado':'Registro eliminado'}.`)};
  }
  confirmRecurring(r:Recurring){if(this.busy||!r.vencido)return;this.confirmation={message:`Registrar ${r.tipo.toLowerCase()} de ${this.currency(r.monto)} en «${r.cuenta}» por «${r.nombre}», con vencimiento ${this.date(r.proxima_fecha)}?`,proceed:()=>this.mutate(this.api.post(`recurrentes/${r.id}/confirmar`,{fecha_prevista:r.proxima_fecha.slice(0,10),confirmar:true}),'Movimiento registrado y próximo vencimiento actualizado.')};}
  openMoneyAction(kind:'abono'|'aporte',item:Debt|Goal){
    this.action=this.emptyAction();this.selectedAction={kind,id:item.id,nombre:item.nombre,limite:kind==='abono'?(item as Debt).pendiente:(item as Goal).restante,walletId:kind==='aporte'?(item as Goal).cuenta_id:undefined};this.error='';
  }
  actionWallets():Wallet[]{return this.wallets.filter(w=>w.id!==this.selectedAction?.walletId);}
  /** Keep the same key on network errors and page reloads, until the server confirms success. */
  operationKey(path:string,payload:unknown):{storage:string;key:string}{
    const storage=`af_pending:${this.auth.usuario()?.id}:${path}:${JSON.stringify(payload)}`;
    const current=sessionStorage.getItem(storage);const key=current||crypto.randomUUID();if(!current)sessionStorage.setItem(storage,key);return {storage,key};
  }
  submitMoneyAction(form:NgForm){
    if(this.busy||!this.selectedAction)return;form.control.markAllAsTouched();if(form.invalid||!moneyIsValid(this.action.monto)){this.error='Selecciona una cartera y un importe válido mayor que cero.';return;}
    const selected=this.selectedAction;if(Number(this.action.monto)>Number(selected.limite)){this.error='El importe supera el saldo pendiente.';return;}
    const path=`${selected.kind==='abono'?'deudas':'metas'}/${selected.id}/${selected.kind==='abono'?'abonos':'aportes'}`;
    const data={monto:this.action.monto,cuenta_id:Number(this.action.cuenta_id)};const operation=this.operationKey(path,data);
    this.mutate(this.api.post(path,{...data,idempotencia:operation.key}),selected.kind==='abono'?'Abono registrado en la cartera seleccionada.':'Aporte transferido a la cartera de ahorro.',()=>{sessionStorage.removeItem(operation.storage);this.selectedAction=null;this.history=null;});
  }
  showHistory(kind:'deudas'|'metas',id:number,name:string){this.historyTitle=`${kind==='deudas'?'Abonos':'Aportes'} · ${name}`;this.history=null;this.historyLoading=true;this.api.get<HistoryEntry[]>(`${kind}/${id}/${kind==='deudas'?'abonos':'aportes'}`).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.historyLoading=false;this.cdr.markForCheck();})).subscribe({next:r=>this.history=r,error:e=>this.showError(e)});}
  openGroup(id:number){this.error='';this.loading=true;this.api.get<GroupDetail>(`grupos/${id}`).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.loading=false;this.cdr.markForCheck();})).subscribe({next:r=>{this.group=r;this.action=this.emptyAction();this.settlementAmount='';},error:e=>this.showError(e)});}
  memberName(id:number){return this.group?.miembros.find(m=>m.id===id)?.nombre||'Miembro';}
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
