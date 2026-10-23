import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** The server remains authoritative; this prevents accidental exponent/sign entry. */
@Directive({selector:'input[type=number]',standalone:true})
export class DecimalInput {
  private readonly element=inject<ElementRef<HTMLInputElement>>(ElementRef);
  @HostListener('keydown',['$event']) key(event:KeyboardEvent):void {
    if(!event.ctrlKey&&!event.metaKey&&['e','E','+','-'].includes(event.key)){event.preventDefault();this.warn();}
  }
  @HostListener('paste',['$event']) paste(event:ClipboardEvent):void {
    const text=event.clipboardData?.getData('text')||'';
    if(!/^\d+(\.\d{0,2})?$/.test(text)){event.preventDefault();this.warn();}
  }
  @HostListener('input') input():void {this.element.nativeElement.setCustomValidity('');}
  @HostListener('blur') blur():void {this.element.nativeElement.setCustomValidity('');}
  private warn():void {const input=this.element.nativeElement;input.setCustomValidity('Usa números positivos y hasta dos decimales, separados por punto.');input.reportValidity();}
}
