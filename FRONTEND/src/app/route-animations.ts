import { animate, group, query, style, transition, trigger } from '@angular/animations';

/**
 * Cross-fade sutil (150ms) al activar una nueva ruta/componente lazy. `app.ts` desactiva
 * esta animacion (pasando siempre el mismo string vacio) si el SO tiene activado
 * prefers-reduced-motion, ya que la API de animaciones de Angular no lo respeta sola.
 */
export const routeFadeAnimation = trigger('routeAnimation', [
  transition('* <=> *', [
    // Sin position:absolute/width a proposito: reposicionar el contenido durante la
    // transicion es fragil (si la animacion no limpia bien, puede dejar el layout roto)
    // y ademas rompe el trigger 'on viewport' de los bloques @defer de los graficos.
    // Solo opacidad: el contenido saliente/entrante se superpone brevemente en el flujo
    // normal, un compromiso visual minimo a cambio de cero riesgo de layout.
    query(':enter', [style({ opacity: 0 })], { optional: true }),
    group([
      query(':leave', [animate('150ms ease', style({ opacity: 0 }))], { optional: true }),
      query(':enter', [animate('150ms ease', style({ opacity: 1 }))], { optional: true }),
    ]),
  ]),
]);
