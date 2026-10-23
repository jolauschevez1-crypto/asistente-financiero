import { formatCalendarMonth, formatReportDate } from '../../core/calendar-date';
import {
  buildBalanceMensualOptions,
  buildCalendarioFinancieroOptions,
  buildIngresosVsGastosOptions,
  buildMovimientosPorDiaOptions,
  buildTendenciaLineOptions,
} from './chart-builders';

describe('Report calendar labels', () => {
  it('keeps October in all monthly charts, including UTC midnight buckets', () => {
    const rows = [{ mes: '2026-10-01T00:00:00.000Z', ingresos: 500, gastos: 25 }];
    for (const build of [buildIngresosVsGastosOptions, buildBalanceMensualOptions, buildTendenciaLineOptions]) {
      const label = String(build(rows).xaxis?.categories?.[0]);
      expect(label).toContain('oct');
      expect(label).toContain('26');
      expect(label).not.toContain('sept');
    }
    expect(formatCalendarMonth('2026-10')).toContain('oct');
    expect(formatCalendarMonth('2026-01-01')).toContain('ene');
  });

  it('keeps the first day of the month in daily chart labels', () => {
    const options = buildMovimientosPorDiaOptions([{ dia: '2026-10-01', cantidad: 1, monto_total: 25 }]);
    const label = String(options.xaxis?.categories?.[0]);
    expect(label).toContain('01');
    expect(label).toContain('oct');
  });

  it('preserves date-only report filters while real timestamps remain local', () => {
    expect(formatReportDate('2026-10-01')).toBe('1/10/2026');
    const instant = '2026-10-01T02:00:00.000Z';
    expect(formatReportDate(instant)).toBe(new Date(instant).toLocaleDateString('es-ES'));
    expect(formatCalendarMonth('2026-13-01')).toBe('—');
  });

  it('assigns heatmap data to its calendar day even late at night', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 9, 21, 23, 30));
      const options = buildCalendarioFinancieroOptions([{ dia: '2026-10-21', monto_total: 17 }]);
      const weeks = options.series as { name: string; data: { x: string; y: number }[] }[];
      expect(weeks[weeks.length - 1].data.find(point => point.x === 'Mie')?.y).toBe(17);
      expect(weeks.flatMap(week => week.data).filter(point => point.y === 17).length).toBe(1);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
