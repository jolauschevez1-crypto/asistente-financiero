/**
 * Aritmética de dinero en centavos enteros (BigInt) y tasas decimales exactas.
 * Espejo de BACKEND/src/finance/fx.js: el servidor sigue siendo la fuente de verdad;
 * esto solo sirve para estimaciones en pantalla, siempre rotuladas como tales.
 */
export type Amount = string | number | null | undefined;

const MONEY_RE = /^-?\d+(\.\d{1,2})?$/;
const RATE_RE = /^\d{1,9}(\.\d{1,12})?$/;

/** "12.5" → 1250n. Valores no válidos → null. */
export function toCents(value: Amount): bigint | null {
  if (value === null || value === undefined || value === '') return null;
  const text = typeof value === 'number' ? value.toFixed(2) : String(value).trim();
  if (!MONEY_RE.test(text)) return null;
  const negative = text.startsWith('-');
  const [whole, part = ''] = text.replace('-', '').split('.');
  const cents = BigInt(whole) * 100n + BigInt(part.padEnd(2, '0'));
  return negative ? -cents : cents;
}

/** 1250n → "12.50". */
export function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  return `${negative ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

/** Convierte con redondeo half-up (simétrico respecto a cero). Tasa no válida → null. */
export function convert(value: Amount, rate: string | null | undefined): string | null {
  const cents = toCents(value);
  if (cents === null || !rate || !RATE_RE.test(rate)) return null;
  const [a, b = ''] = rate.split('.');
  const d = 10n ** BigInt(b.length);
  const n = BigInt(a) * d + BigInt(b || '0');
  const abs = cents < 0n ? -cents : cents;
  const result = (abs * n * 2n + d) / (2n * d);
  return fromCents(cents < 0n ? -result : result);
}

/** Suma exacta de importes. */
export function sum(values: Amount[]): string {
  return fromCents(values.reduce<bigint>((acc, v) => acc + (toCents(v) ?? 0n), 0n));
}

/** Para barras y porcentajes de pantalla (no para dinero). */
export function ratio(part: Amount, whole: Amount): number {
  const p = toCents(part) ?? 0n, w = toCents(whole) ?? 0n;
  if (w <= 0n) return 0;
  return Number((p * 10000n) / w) / 100;
}

/** Multiplica por num/den con redondeo half-up (estimaciones como 52/12 semanas por mes). */
export function scale(value: Amount, num: number, den: number): string | null {
  const cents = toCents(value);
  if (cents === null || !Number.isInteger(num) || !Number.isInteger(den) || den <= 0) return null;
  const n = BigInt(num), d = BigInt(den), abs = cents < 0n ? -cents : cents;
  const result = (abs * n * 2n + d) / (2n * d);
  return fromCents(cents < 0n ? -result : result);
}

/** Compara dos importes exactos: -1, 0 o 1. */
export function compare(a: Amount, b: Amount): number {
  const x = toCents(a) ?? 0n, y = toCents(b) ?? 0n;
  return x < y ? -1 : x > y ? 1 : 0;
}
