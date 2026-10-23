/**
 * @file reporteDto.js
 * @description Formas de salida (DTO) del modulo de Reportes: traduce el resultado uniforme
 * { resumen, datos, chartDatos } de adminModel.obtenerDatosReporte en las estructuras que
 * necesitan los exportadores (CSV/Excel/PDF) y el grafico del PDF. Reubicado sin cambios desde
 * reportesAdminController.js (antes vivia inline en el controlador).
 */
const { neutralizarCeldaTexto } = require('../utils/csv');

/**
 * @param {string} fechaIso
 * @returns {string} Fecha corta en formato "mmm aa" (es-ES).
 */
function formatMesCorto(fechaIso) {
    return new Date(fechaIso).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

/**
 * Traduce { resumen, datos, chartDatos } al par { encabezados, filas } generico usado por
 * los exportadores CSV/Excel/PDF, segun el tipo de reporte.
 * @param {string} tipo Uno de los 9 tipos de reporte soportados.
 * @param {object[]} datos Arreglo de datos crudo devuelto por adminModel.obtenerDatosReporte.
 * @returns {{ encabezados: string[], filas: Array<Array<string|number>> }}
 */
function tablaParaExportar(tipo, datos) {
    switch (tipo) {
        case 'ingresos-mensuales':
        case 'gastos-mensuales':
        case 'balance-mensual':
            return {
                encabezados: ['Mes', 'Ingresos', 'Gastos', 'Balance'],
                filas: datos.map((d) => [formatMesCorto(d.mes), d.ingresos, d.gastos, d.ingresos - d.gastos]),
            };
        case 'balance-anual':
            return {
                encabezados: ['Anio', 'Ingresos', 'Gastos', 'Balance'],
                filas: datos.map((d) => [d.anio, d.ingresos, d.gastos, d.balance]),
            };
        case 'top-usuarios':
            return {
                encabezados: ['Usuario', 'Correo', 'Cantidad movimientos', 'Monto total'],
                filas: datos.map((d) => [neutralizarCeldaTexto(d.nombre), neutralizarCeldaTexto(d.correo), d.cantidad_movimientos, d.monto_total]),
            };
        case 'top-categorias':
            return {
                encabezados: ['Categoria', 'Cantidad', 'Monto total'],
                filas: datos.map((d) => [neutralizarCeldaTexto(d.categoria), d.cantidad, d.monto_total]),
            };
        case 'movimientos-usuario':
        case 'movimientos-fecha':
            return {
                encabezados: ['ID', 'Fecha', 'Usuario', 'Correo', 'Categoria', 'Tipo', 'Monto', 'Descripcion', 'Estado'],
                filas: datos.map((m) => [
                    m.id, m.fecha, neutralizarCeldaTexto(m.usuario_nombre), neutralizarCeldaTexto(m.usuario_correo),
                    neutralizarCeldaTexto(m.categoria), m.tipo, m.monto,
                    neutralizarCeldaTexto(m.descripcion), m.deleted_at ? 'Eliminado' : 'Activo',
                ]),
            };
        case 'comparativas':
            return {
                encabezados: ['Periodo', 'Ingresos', 'Gastos', 'Balance', 'Cantidad movimientos'],
                filas: datos.map((d) => [d.periodo, d.ingresos, d.gastos, d.balance, d.cantidadMovimientos]),
            };
        default:
            return { encabezados: [], filas: [] };
    }
}

/**
 * Arma una serie { categorias, valores } lista para el grafico de barras del PDF.
 * @param {string} tipo Uno de los 9 tipos de reporte soportados.
 * @param {{ datos: object[], chartDatos?: object[] }} resultado
 * @returns {{ categorias: string[], valores: number[] }}
 */
function serieParaGrafico(tipo, resultado) {
    const { datos, chartDatos } = resultado;
    switch (tipo) {
        case 'ingresos-mensuales':
            return { categorias: datos.map((d) => formatMesCorto(d.mes)), valores: datos.map((d) => d.ingresos) };
        case 'gastos-mensuales':
            return { categorias: datos.map((d) => formatMesCorto(d.mes)), valores: datos.map((d) => d.gastos) };
        case 'balance-mensual':
            return { categorias: datos.map((d) => formatMesCorto(d.mes)), valores: datos.map((d) => d.ingresos - d.gastos) };
        case 'balance-anual':
            return { categorias: datos.map((d) => String(d.anio)), valores: datos.map((d) => d.balance) };
        case 'top-usuarios':
            return { categorias: datos.map((d) => d.nombre || d.correo || `#${d.id}`), valores: datos.map((d) => d.cantidad_movimientos) };
        case 'top-categorias':
            return { categorias: datos.map((d) => d.categoria), valores: datos.map((d) => d.cantidad) };
        case 'movimientos-usuario':
        case 'movimientos-fecha':
            return { categorias: (chartDatos || []).map((d) => d.dia), valores: (chartDatos || []).map((d) => d.cantidad) };
        case 'comparativas':
            return { categorias: datos.map((d) => d.periodo), valores: datos.map((d) => d.balance) };
        default:
            return { categorias: [], valores: [] };
    }
}

module.exports = { formatMesCorto, tablaParaExportar, serieParaGrafico };
