export const CUSTOM_CATEGORY_VALUE = '__categoria_personalizada__';

const DEFAULT_CATEGORIES = [
  'Alimentación', 'Comida', 'Transporte', 'Vivienda', 'Servicios', 'Salud',
  'Educación', 'Entretenimiento', 'Compras', 'Suscripciones', 'Sueldo',
  'Salario', 'Inversión', 'Otros',
];

/** Keep saved names unchanged: they are the values used by the movement API. */
export function buildCategoryOptions(existing: ReadonlyArray<string | null | undefined> = []): string[] {
  return [...new Set([...existing, ...DEFAULT_CATEGORIES]
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}
