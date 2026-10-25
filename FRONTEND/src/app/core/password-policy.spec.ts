import { ITEM_NAME, PERSON_NAME, passwordChecks, passwordMatchesIdentity, passwordStrength } from './input-validation';

describe('validación de entradas (requisito 2026-10-25)', () => {
  const failing = (p: string, name = '', email = '') => passwordChecks(p, name, email).filter(c => !c.ok).map(c => c.id);
  it('acepta una contraseña que cumple todo', () => {
    expect(failing('Ciruela#2026x', 'Mariana López', 'mlopez@example.test')).toEqual([]);
    expect(passwordStrength({ value: 'Ciruela#2026x' } as never)).toBeNull();
  });
  it('señala cada requisito pendiente', () => {
    expect(failing('corta')).toEqual(jasmine.arrayContaining(['length', 'upper', 'digit', 'special']));
    expect(failing('Clave Fuerte#26')).toContain('spaces');
    expect(passwordStrength({ value: 'clavefuerte#26' } as never)).toEqual({ passwordStrength: true });
  });
  it('rechaza contraseñas iguales o que contienen nombre, usuario o correo', () => {
    expect(passwordMatchesIdentity('Mariana#2026', 'Mariana López', 'x@example.test')).toBeTrue();
    expect(passwordMatchesIdentity('Clave#mlopez9', 'Ana', 'mlopez@example.test')).toBeTrue();
    expect(passwordMatchesIdentity('Ciruela#2026x', 'Mariana López', 'mlopez@example.test')).toBeFalse();
  });
  it('nombres de persona solo letras; nombres de carteras sin emojis ni marcado', () => {
    expect(PERSON_NAME.test('María-José O’Neil')).toBeTrue();
    expect(PERSON_NAME.test('Juan123')).toBeFalse();
    expect(ITEM_NAME.test('Cuenta 2 (Banco & Co.)')).toBeTrue();
    expect(ITEM_NAME.test('<script>')).toBeFalse();
    expect(ITEM_NAME.test('Ahorro 😀')).toBeFalse();
  });
});
