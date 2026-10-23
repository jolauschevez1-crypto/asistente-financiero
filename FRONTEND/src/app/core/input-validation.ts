import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function normalizedIdentity(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('es').replace(/\s+/g, '');
}
export const nonBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && !control.value.trim() ? { blank: true } : null;
export const passwordLength: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  return value.length >= 10 && new TextEncoder().encode(value).length <= 72 ? null : { passwordLength: true };
};
export const validBirthDate: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { birthDate: true };
  const date = new Date(value + 'T12:00:00Z');
  const today = new Date();
  const localToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= localToday
    ? null : { birthDate: true };
};
export const moneyAmount: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 999999999.99
    ? null : { moneyAmount: true };
};
export function passwordMatchesIdentity(password: string, name: string, email: string): boolean {
  const candidate = normalizedIdentity(password);
  return [name, email, email.split('@')[0]].filter(Boolean).some(v => normalizedIdentity(v) === candidate);
}
