import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function normalizedIdentity(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('es').replace(/\s+/g, '');
}
export const nonBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && !control.value.trim() ? { blank: true } : null;
/** Requisitos de contraseña, iguales a los del backend (BACKEND/src/utils/validation.js). */
export interface PasswordCheck { id: string; label: string; ok: boolean }
export function passwordChecks(value: string, name = '', email = ''): PasswordCheck[] {
  const v = String(value ?? '');
  return [
    { id: 'length', label: 'Entre 10 caracteres y 72 bytes', ok: v.length >= 10 && new TextEncoder().encode(v).length <= 72 },
    { id: 'upper', label: 'Una letra mayúscula', ok: /\p{Lu}/u.test(v) },
    { id: 'lower', label: 'Una letra minúscula', ok: /\p{Ll}/u.test(v) },
    { id: 'digit', label: 'Un número', ok: /\d/.test(v) },
    { id: 'special', label: 'Un carácter especial (! @ # $ %…)', ok: /[^\p{L}\p{N}\s]/u.test(v) },
    { id: 'spaces', label: 'Sin espacios', ok: v.length > 0 && !/\s/.test(v) },
    { id: 'identity', label: 'Que no sea ni contenga tu nombre o correo', ok: v.length > 0 && !passwordMatchesIdentity(v, name, email) },
  ];
}
/** Valida fuerza (sin identidad); la identidad se comprueba con passwordMatchesIdentity. */
export const passwordStrength: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  passwordChecks(String(control.value ?? '')).filter(c => c.id !== 'identity').every(c => c.ok) ? null : { passwordStrength: true };
/** @deprecated nombre histórico; aplica ya la política completa de fuerza. */
export const passwordLength = passwordStrength;
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
  const ids = [name, email, (email || '').split('@')[0], ...(name || '').split(/\s+/)]
    .filter(Boolean).map(normalizedIdentity).filter(v => v.length >= 4);
  return ids.some(v => candidate === v || candidate.includes(v));
}
/** Nombres de personas: solo letras, espacios, guiones y apóstrofes. */
export const PERSON_NAME = /^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u;
/** Nombres de carteras, metas y grupos: letras, números y signos básicos, sin emojis ni marcado. */
export const ITEM_NAME = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,:;'’()#&\/+-]*$/u;
export const itemName: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  !control.value || ITEM_NAME.test(String(control.value).trim()) ? null : { itemName: true };
