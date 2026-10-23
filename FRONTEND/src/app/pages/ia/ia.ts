import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { IaChatMensaje, IaRespuesta } from '../../core/models';
import { Notice } from '../../shared/notice/notice';
import { PanelCard } from '../../shared/panel-card/panel-card';
import { Skeleton } from '../../shared/skeleton/skeleton';

type SeccionIA = 'gastos' | 'ingresos' | 'innecesarios' | 'reporte' | 'prediccion' | 'consejos';

interface SeccionConfig {
  clave: SeccionIA;
  titulo: string;
  icon: string;
}

const SECCIONES: SeccionConfig[] = [
  { clave: 'gastos', titulo: 'Analizar gastos', icon: 'trending_down' },
  { clave: 'ingresos', titulo: 'Analizar ingresos', icon: 'trending_up' },
  { clave: 'innecesarios', titulo: 'Gastos innecesarios', icon: 'warning' },
  { clave: 'reporte', titulo: 'Reporte financiero', icon: 'description' },
  { clave: 'prediccion', titulo: 'Predicción financiera', icon: 'insights' },
  { clave: 'consejos', titulo: 'Consejos financieros', icon: 'lightbulb' },
];

@Component({
  selector: 'app-ia',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTabsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    PanelCard,
    Skeleton,
    Notice,
  ],
  templateUrl: './ia.html',
  styleUrl: './ia.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ia implements OnInit {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  readonly habilitada = signal(false);
  readonly estadoIA = signal('Consultando disponibilidad de IA…');
  ngOnInit(): void {
    this.http.get<{data:{enabled:boolean;message:string}}>(environment.apiBaseUrl + '/ia/estado').subscribe({
      next: ({data}) => { this.habilitada.set(data.enabled); this.estadoIA.set(data.message); },
      error: () => this.estadoIA.set('La IA no está disponible. Puedes seguir usando los módulos financieros.'),
    });
  }

  readonly secciones = SECCIONES;

  // Pestaña "Preguntar a la IA" — historial vive solo en memoria (signal), no se persiste.
  readonly mensajes = signal<IaChatMensaje[]>([]);
  readonly preguntaActual = signal('');
  readonly enviandoPregunta = signal(false);
  readonly errorChat = signal('');

  // 6 pestañas de análisis — carga perezosa (solo al abrir la pestaña) + caché en memoria.
  readonly cargando = signal<Record<SeccionIA, boolean>>(this.crearEstadoInicial(false));
  readonly resultados = signal<Record<SeccionIA, IaRespuesta | null>>(this.crearEstadoInicial(null));
  readonly errores = signal<Record<SeccionIA, string>>(this.crearEstadoInicial(''));

  onTabChange(index: number): void {
    if (!this.habilitada()) return;
    if (index === 0) return; // pestaña de chat, no requiere carga
    const seccion = SECCIONES[index - 1];
    if (seccion && !this.resultados()[seccion.clave] && !this.cargando()[seccion.clave]) {
      this.cargarSeccion(seccion.clave);
    }
  }

  cargarSeccion(clave: SeccionIA): void {
    if (!this.habilitada()) return;
    this.cargando.update((estado) => ({ ...estado, [clave]: true }));
    this.errores.update((estado) => ({ ...estado, [clave]: '' }));

    this.obtenerObservable(clave).subscribe({
      next: (data) => {
        this.resultados.update((estado) => ({ ...estado, [clave]: data }));
        this.cargando.update((estado) => ({ ...estado, [clave]: false }));
      },
      error: (err) => {
        this.cargando.update((estado) => ({ ...estado, [clave]: false }));
        this.errores.update((estado) => ({
          ...estado,
          [clave]: err?.error?.message || 'No se pudo generar el análisis. Intenta nuevamente.',
        }));
      },
    });
  }

  regenerar(clave: SeccionIA): void {
    this.resultados.update((estado) => ({ ...estado, [clave]: null }));
    this.cargarSeccion(clave);
  }

  enviarPregunta(): void {
    if (!this.habilitada()) return;
    const pregunta = this.preguntaActual().trim();
    if (!pregunta || this.enviandoPregunta()) return;

    const mensajeUsuario: IaChatMensaje = { rol: 'user', texto: pregunta, timestamp: new Date().toISOString() };
    this.mensajes.update((lista) => [...lista, mensajeUsuario]);
    this.preguntaActual.set('');
    this.enviandoPregunta.set(true);
    this.errorChat.set('');

    const historialPrevio = this.mensajes().slice(0, -1);

    this.api.preguntarIA(pregunta, historialPrevio).subscribe({
      next: (data) => {
        const mensajeIA: IaChatMensaje = { rol: 'ia', texto: data.respuesta, timestamp: new Date().toISOString() };
        this.mensajes.update((lista) => [...lista, mensajeIA]);
        this.enviandoPregunta.set(false);
      },
      error: (err) => {
        this.enviandoPregunta.set(false);
        this.errorChat.set(err?.error?.message || 'No se pudo consultar a la IA. Intenta nuevamente.');
      },
    });
  }

  private obtenerObservable(clave: SeccionIA): Observable<IaRespuesta> {
    switch (clave) {
      case 'gastos':
        return this.api.analizarGastosIA();
      case 'ingresos':
        return this.api.analizarIngresosIA();
      case 'innecesarios':
        return this.api.detectarGastosInnecesariosIA();
      case 'reporte':
        return this.api.generarReporteIA();
      case 'prediccion':
        return this.api.generarPrediccionIA();
      case 'consejos':
        return this.api.generarConsejosIA();
    }
  }

  private crearEstadoInicial<T>(valor: T): Record<SeccionIA, T> {
    return {
      gastos: valor,
      ingresos: valor,
      innecesarios: valor,
      reporte: valor,
      prediccion: valor,
      consejos: valor,
    };
  }
}
