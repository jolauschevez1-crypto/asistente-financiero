/** Quote every column, including dates and payment methods. Escape spreadsheet formulas in text. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function csvDocument(rows: unknown[][]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
