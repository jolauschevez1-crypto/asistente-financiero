import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../currency.service';

/**
 * @pipe FormatoMonedaPipe
 * Formatea sin conversión y con código explícito. Las vistas administrativas
 * deben pasar la moneda del propietario o del reporte como segundo argumento.
 */
@Pipe({
  name: 'formatoMoneda',
  standalone: true,
  pure: false,
})
export class FormatoMonedaPipe implements PipeTransform {
  private readonly currency=inject(CurrencyService);
  transform(value:number|string|null|undefined,codeOrLegacyFlag?:string|boolean):string {
    return this.currency.format(value,typeof codeOrLegacyFlag==='string'?codeOrLegacyFlag:undefined);
  }
}
