/**
 * @file dateRangePresets.js
 * @description Traduce el nombre de un preset de rango de fechas a un objeto {fechaDesde, fechaHasta}.
 * Unifica los dos vocabularios que hoy coexisten en el backend: los presets cortos usados en
 * Movimientos Global (hoy/semana/mes/anio) y los presets usados en Reportes (mes-actual/mes-anterior/
 * anio-actual/anio-anterior). Cada llamador decide si convierte el resultado a ISO string, y si
 * permite un rango de fechas personalizado ademas del preset - esta funcion solo resuelve el preset.
 */

/**
 * @param {string|undefined} preset Nombre del preset (hoy, semana, mes, anio, mes-actual,
 *   mes-anterior, anio-actual, anio-anterior). Cualquier otro valor (incluido undefined) no
 *   resuelve ningun rango.
 * @param {Date} [ahora] Fecha de referencia; por defecto el momento actual. Parametrizable para pruebas.
 * @returns {{ fechaDesde: Date|undefined, fechaHasta: Date|undefined }}
 */
function resolverRangoFecha(preset, ahora = new Date()) {
    switch (preset) {
        case 'hoy': {
            const fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            const fechaHasta = new Date(fechaDesde.getTime() + 24 * 60 * 60 * 1000);
            return { fechaDesde, fechaHasta };
        }
        case 'semana':
            return { fechaDesde: new Date(ahora.getTime() - 6 * 24 * 60 * 60 * 1000), fechaHasta: undefined };
        case 'mes':
            return { fechaDesde: new Date(ahora.getFullYear(), ahora.getMonth(), 1), fechaHasta: undefined };
        case 'anio':
            return { fechaDesde: new Date(ahora.getFullYear(), 0, 1), fechaHasta: undefined };
        case 'mes-actual':
            return {
                fechaDesde: new Date(ahora.getFullYear(), ahora.getMonth(), 1),
                fechaHasta: new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1),
            };
        case 'mes-anterior':
            return {
                fechaDesde: new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1),
                fechaHasta: new Date(ahora.getFullYear(), ahora.getMonth(), 1),
            };
        case 'anio-actual':
            return {
                fechaDesde: new Date(ahora.getFullYear(), 0, 1),
                fechaHasta: new Date(ahora.getFullYear() + 1, 0, 1),
            };
        case 'anio-anterior':
            return {
                fechaDesde: new Date(ahora.getFullYear() - 1, 0, 1),
                fechaHasta: new Date(ahora.getFullYear(), 0, 1),
            };
        default:
            return { fechaDesde: undefined, fechaHasta: undefined };
    }
}

module.exports = { resolverRangoFecha };
