import { ApexOptions } from 'ng-apexcharts';
import { formatCalendarDate, formatCalendarMonth } from '../../core/calendar-date';
import {
  BalanceAnual,
  CategoriaUsada,
  ComparativaPeriodo,
  GastoCategoriaMes,
  MovimientoPorDia,
  TendenciaMensual,
  UsuarioTop,
} from '../../core/models';

const COLOR_CYAN = '#38bdf8';
const COLOR_TEAL = '#0f766e';
const COLOR_BLUE = '#2563eb';
const COLOR_DANGER = '#f87171';
const COLOR_VIOLET = '#a78bfa';
const COLOR_AMBER = '#fbbf24';

const BASE_OPTIONS: Partial<ApexOptions> = {
  chart: {
    type: 'bar',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    foreColor: '#9fb1c8',
    toolbar: { show: false },
    background: 'transparent',
  },
  grid: { borderColor: 'rgba(148, 163, 184, 0.16)', strokeDashArray: 4 },
  tooltip: { theme: 'dark' },
  legend: { labels: { colors: '#9fb1c8' } },
};

function formatMes(mes: string): string {
  return formatCalendarMonth(mes);
}

function formatDia(dia: string): string {
  return formatCalendarDate(dia, { day: '2-digit', month: 'short' });
}

function toIsoDate(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function buildIngresosVsGastosOptions(tendenciaMensual: TendenciaMensual[]): ApexOptions {
  const categorias = tendenciaMensual.map((t) => formatMes(t.mes));
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'bar', height: 260 },
    colors: [COLOR_TEAL, COLOR_DANGER],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: categorias, labels: { style: { colors: '#9fb1c8' } } },
    series: [
      { name: 'Ingresos', data: tendenciaMensual.map((t) => Number(t.ingresos)) },
      { name: 'Gastos', data: tendenciaMensual.map((t) => Number(t.gastos)) },
    ],
  };
}

export function buildBalanceMensualOptions(tendenciaMensual: TendenciaMensual[]): ApexOptions {
  const categorias = tendenciaMensual.map((t) => formatMes(t.mes));
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'area', height: 260 },
    colors: [COLOR_CYAN],
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] },
    },
    xaxis: { categories: categorias, labels: { style: { colors: '#9fb1c8' } } },
    series: [
      {
        name: 'Balance neto',
        data: tendenciaMensual.map((t) => Number(t.ingresos) - Number(t.gastos)),
      },
    ],
  };
}

export function buildMovimientosPorDiaOptions(movimientosPorDia: MovimientoPorDia[]): ApexOptions {
  const categorias = movimientosPorDia.map((d) => formatDia(d.dia));
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'bar', height: 260 },
    colors: [COLOR_BLUE],
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: categorias, labels: { style: { colors: '#9fb1c8' }, rotate: -45 } },
    series: [{ name: 'Movimientos', data: movimientosPorDia.map((d) => Number(d.cantidad)) }],
  };
}

export function buildCategoriasOptions(categoriasMasUsadas: CategoriaUsada[]): ApexOptions {
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'donut', height: 260 },
    colors: [COLOR_CYAN, COLOR_TEAL, COLOR_BLUE, COLOR_VIOLET, COLOR_AMBER, COLOR_DANGER],
    labels: categoriasMasUsadas.map((c) => c.categoria),
    dataLabels: { enabled: true, style: { colors: ['#f8fafc'] } },
    series: categoriasMasUsadas.map((c) => Number(c.cantidad)),
  };
}

export function buildUserGastosCategoriaOptions(gastosCategoriaMes: GastoCategoriaMes[]): ApexOptions {
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'donut', height: 220 },
    colors: [COLOR_CYAN, COLOR_TEAL, COLOR_BLUE, COLOR_VIOLET, COLOR_AMBER, COLOR_DANGER],
    labels: gastosCategoriaMes.map((g) => g.categoria),
    dataLabels: { enabled: true, style: { colors: ['#f8fafc'] } },
    series: gastosCategoriaMes.map((g) => Number(g.total)),
  };
}

export function buildTopUsuariosOptions(topUsuarios: UsuarioTop[]): ApexOptions {
  const categorias = topUsuarios.map((u) => u.nombre || u.correo || `Usuario #${u.id}`);
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'bar', height: 260 },
    colors: [COLOR_TEAL],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: categorias, labels: { style: { colors: '#9fb1c8' } } },
    series: [{ name: 'Movimientos', data: topUsuarios.map((u) => Number(u.cantidad_movimientos)) }],
  };
}

export function buildBalanceAnualOptions(serieAnual: BalanceAnual[]): ApexOptions {
  const categorias = serieAnual.map((s) => String(s.anio));
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'bar', height: 260 },
    colors: [COLOR_TEAL, COLOR_DANGER, COLOR_CYAN],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: categorias, labels: { style: { colors: '#9fb1c8' } } },
    series: [
      { name: 'Ingresos', data: serieAnual.map((s) => Number(s.ingresos)) },
      { name: 'Gastos', data: serieAnual.map((s) => Number(s.gastos)) },
      { name: 'Balance', data: serieAnual.map((s) => Number(s.balance)) },
    ],
  };
}

export function buildComparativaOptions(periodos: ComparativaPeriodo[]): ApexOptions {
  const categorias = periodos.map((p) => p.periodo);
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'bar', height: 260 },
    colors: [COLOR_TEAL, COLOR_DANGER, COLOR_CYAN],
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: categorias, labels: { style: { colors: '#9fb1c8' } } },
    series: [
      { name: 'Ingresos', data: periodos.map((p) => Number(p.ingresos)) },
      { name: 'Gastos', data: periodos.map((p) => Number(p.gastos)) },
      { name: 'Balance', data: periodos.map((p) => Number(p.balance)) },
    ],
  };
}

export function buildCategoriasPieOptions(categoriasMasUsadas: CategoriaUsada[]): ApexOptions {
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'pie', height: 260 },
    colors: [COLOR_CYAN, COLOR_TEAL, COLOR_BLUE, COLOR_VIOLET, COLOR_AMBER, COLOR_DANGER],
    labels: categoriasMasUsadas.map((c) => c.categoria),
    dataLabels: { enabled: true, style: { colors: ['#f8fafc'] } },
    series: categoriasMasUsadas.map((c) => Number(c.cantidad)),
  };
}

export function buildTendenciaLineOptions(tendenciaMensual: TendenciaMensual[]): ApexOptions {
  const categorias = tendenciaMensual.map((t) => formatMes(t.mes));
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'line', height: 260 },
    colors: [COLOR_TEAL, COLOR_DANGER],
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    xaxis: { categories: categorias, labels: { style: { colors: '#9fb1c8' } } },
    series: [
      { name: 'Ingresos', data: tendenciaMensual.map((t) => Number(t.ingresos)) },
      { name: 'Gastos', data: tendenciaMensual.map((t) => Number(t.gastos)) },
    ],
  };
}

export function buildCategoriasRadarOptions(categoriasMasUsadas: CategoriaUsada[]): ApexOptions {
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'radar', height: 260 },
    colors: [COLOR_VIOLET],
    xaxis: { categories: categoriasMasUsadas.map((c) => c.categoria), labels: { style: { colors: '#9fb1c8' } } },
    series: [{ name: 'Movimientos', data: categoriasMasUsadas.map((c) => Number(c.cantidad)) }],
  };
}

export function buildUsuariosDonutOptions(topUsuarios: UsuarioTop[]): ApexOptions {
  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'donut', height: 260 },
    colors: [COLOR_CYAN, COLOR_TEAL, COLOR_BLUE, COLOR_VIOLET, COLOR_AMBER, COLOR_DANGER],
    labels: topUsuarios.map((u) => u.nombre || u.correo || `Usuario #${u.id}`),
    dataLabels: { enabled: true, style: { colors: ['#f8fafc'] } },
    series: topUsuarios.map((u) => Number(u.monto_total)),
  };
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const NUM_SEMANAS_CALENDARIO = 12;

export function buildCalendarioFinancieroOptions(chartDatos: { dia: string; monto_total: number }[]): ApexOptions {
  const mapa = new Map(chartDatos.map((d) => [String(d.dia).slice(0, 10), Number(d.monto_total)]));

  const hoy = new Date();
  const diaSemanaHoy = (hoy.getDay() + 6) % 7; // 0 = Lunes .. 6 = Domingo
  const finSemana = new Date(hoy);
  finSemana.setDate(hoy.getDate() + (6 - diaSemanaHoy));
  const inicioVentana = new Date(finSemana);
  inicioVentana.setDate(finSemana.getDate() - (NUM_SEMANAS_CALENDARIO * 7 - 1));

  const series = [];
  for (let semana = 0; semana < NUM_SEMANAS_CALENDARIO; semana++) {
    const puntos = [];
    for (let dia = 0; dia < 7; dia++) {
      const fecha = new Date(inicioVentana);
      fecha.setDate(inicioVentana.getDate() + semana * 7 + dia);
      puntos.push({ x: DIAS_SEMANA[dia], y: Math.round(mapa.get(toIsoDate(fecha)) ?? 0) });
    }
    const inicioSemanaFecha = new Date(inicioVentana);
    inicioSemanaFecha.setDate(inicioVentana.getDate() + semana * 7);
    series.push({ name: inicioSemanaFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), data: puntos });
  }

  return {
    ...BASE_OPTIONS,
    chart: { ...BASE_OPTIONS.chart, type: 'heatmap', height: 320 },
    dataLabels: { enabled: false },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.6,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: 'rgba(148, 163, 184, 0.16)', name: 'Sin actividad' },
            { from: 0.01, to: 100, color: COLOR_CYAN, name: 'Bajo' },
            { from: 100.01, to: 500, color: COLOR_TEAL, name: 'Medio' },
            { from: 500.01, to: 999999999, color: COLOR_VIOLET, name: 'Alto' },
          ],
        },
      },
    },
    series,
  };
}
