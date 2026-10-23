import { FormControl } from '@angular/forms';
import { moneyAmount, nonBlank, passwordLength, passwordMatchesIdentity, validBirthDate } from './input-validation';
import { csvDocument, csvCell } from './csv';

describe('Validaciones de datos reales', () => {
  it('rechaza nombre con espacios y permite nombres con acentos', () => {
    expect(nonBlank(new FormControl('   '))).not.toBeNull();
    expect(nonBlank(new FormControl('María José'))).toBeNull();
  });
  it('impide usar nombre o correo como contraseña, ignorando caso y espacios', () => {
    expect(passwordMatchesIdentity('  ManuelHurtado ', 'Manuel Hurtado', 'manuel@example.test')).toBeTrue();
    expect(passwordMatchesIdentity('MANUEL', 'Otro', 'manuel@example.test')).toBeTrue();
    expect(passwordMatchesIdentity('UnaClaveDistinta42', 'Manuel', 'manuel@example.test')).toBeFalse();
  });
  it('controla mínimo de caracteres y límite real de bytes bcrypt', () => {
    expect(passwordLength(new FormControl('corta'))).not.toBeNull();
    expect(passwordLength(new FormControl('ClaveLocal2026!'))).toBeNull();
    expect(passwordLength(new FormControl('á'.repeat(37)))).not.toBeNull();
  });
  it('valida fecha opcional, bisiesto, fecha inexistente y futura', () => {
    expect(validBirthDate(new FormControl(''))).toBeNull();
    expect(validBirthDate(new FormControl('2004-02-29'))).toBeNull();
    expect(validBirthDate(new FormControl('2003-02-29'))).not.toBeNull();
    expect(validBirthDate(new FormControl('2999-01-01'))).not.toBeNull();
  });
  it('valida centavos sin redondear datos inválidos', () => {
    for (const value of [0,-1,1.001,'NaN','Infinity','1e4',1000000000]) expect(moneyAmount(new FormControl(value))).not.toBeNull();
    for (const value of ['0.01','123.45','999999999.99']) expect(moneyAmount(new FormControl(value))).toBeNull();
  });
  it('escapa CSV incluyendo comas, comillas, saltos y fórmulas de hoja', () => {
    expect(csvDocument([['Fecha','Método'],['19/10/2026, 10:00','TARJETA, VISA']])).toBe('"Fecha","Método"\r\n"19/10/2026, 10:00","TARJETA, VISA"');
    expect(csvCell('Texto "citado"\nlínea')).toBe('"Texto ""citado""\nlínea"');
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
  });
});
