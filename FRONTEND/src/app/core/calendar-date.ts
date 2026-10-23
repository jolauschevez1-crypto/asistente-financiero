/** A report's calendar bucket is a date, not an instant in the browser's time zone. */
export function formatCalendarDate(value: string, options: Intl.DateTimeFormatOptions): string {
  const parts = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:$|T|\s)/.exec(value);
  if (!parts) return '—';
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3] || 1);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '—';
  return date.toLocaleDateString('es-ES', { ...options, timeZone: 'UTC' });
}

export function formatCalendarMonth(value: string): string {
  return formatCalendarDate(value, { month: 'short', year: '2-digit' });
}

/** Filter dates have no time zone; actual movement timestamps retain their local presentation. */
export function formatReportDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatCalendarDate(value, options);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-ES', options);
}
