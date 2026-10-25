import { compare, convert, fromCents, ratio, scale, sum, toCents } from './money';

describe('dinero en centavos enteros', () => {
  it('convierte texto y números sin errores de coma flotante', () => {
    expect(toCents('0.1')).toBe(10n);
    expect(toCents(0.1 + 0.2)).toBe(30n);
    expect(toCents('1e3')).toBeNull();
    expect(toCents('12,50')).toBeNull();
    expect(fromCents(-5n)).toBe('-0.05');
  });
  it('suma exacta', () => {
    expect(sum(['0.10', '0.20', 0.3])).toBe('0.60');
    expect(sum(['999999999.99', '0.01'])).toBe('1000000000.00');
  });
  it('convierte con la misma regla half-up que el servidor', () => {
    expect(convert('50.00', '1.111111111111')).toBe('55.56');
    expect(convert('0.01', '0.5')).toBe('0.01');
    expect(convert('0.01', '0.49')).toBe('0.00');
    expect(convert('-10.00', '0.9')).toBe('-9.00');
    expect(convert('10', null)).toBeNull();
    expect(convert('10', '-1')).toBeNull();
  });
  it('proporción para barras', () => {
    expect(ratio('25', '100')).toBe(25);
    expect(ratio('1', '0')).toBe(0);
  });
  it('escala y compara sin coma flotante', () => {
    expect(scale('12.00', 52, 12)).toBe('52.00');
    expect(scale('10.00', 1, 12)).toBe('0.83');
    expect(compare('0.30', 0.1 + 0.2)).toBe(0);
    expect(compare('1.01', '1.1')).toBe(-1);
  });
});
