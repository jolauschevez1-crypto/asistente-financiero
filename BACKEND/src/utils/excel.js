/**
 * @file excel.js
 * @description Generador genérico de workbooks .xlsx (una hoja: título, resumen, tabla) con exceljs.
 */
const ExcelJS = require('exceljs');

/**
 * @param {object} opts
 * @param {string} opts.titulo Título del reporte (también nombre de la hoja, truncado a 31 chars).
 * @param {string[]} opts.encabezados Encabezados de columna de la tabla de detalle.
 * @param {Array<Array<string|number|null>>} opts.filas Filas de la tabla de detalle.
 * @param {Record<string, string|number|null>} [opts.resumen] Pares clave/valor de KPIs a mostrar arriba de la tabla.
 * @returns {Promise<Buffer>}
 */
async function generarExcelReporte({ titulo, encabezados, filas, resumen = {} }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Asistente Financiero';
    workbook.created = new Date();

    const hoja = workbook.addWorksheet((titulo || 'Reporte').slice(0, 31));

    const columnas = Math.max(encabezados.length, 2);
    hoja.mergeCells(1, 1, 1, columnas);
    const celdaTitulo = hoja.getCell(1, 1);
    celdaTitulo.value = titulo;
    celdaTitulo.font = { bold: true, size: 14 };

    hoja.getCell(2, 1).value = `Generado: ${new Date().toLocaleString('es-ES')}`;
    hoja.getCell(2, 1).font = { italic: true, color: { argb: 'FF64748B' } };

    let filaActual = 4;
    const entradasResumen = Object.entries(resumen).filter(([, valor]) => valor !== undefined);
    if (entradasResumen.length > 0) {
        hoja.getCell(filaActual, 1).value = 'Resumen';
        hoja.getCell(filaActual, 1).font = { bold: true };
        filaActual += 1;
        entradasResumen.forEach(([clave, valor]) => {
            hoja.getCell(filaActual, 1).value = clave;
            hoja.getCell(filaActual, 2).value = valor === null ? '' : valor;
            filaActual += 1;
        });
        filaActual += 1;
    }

    const filaEncabezados = hoja.getRow(filaActual);
    encabezados.forEach((texto, i) => {
        const celda = filaEncabezados.getCell(i + 1);
        celda.value = texto;
        celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    });
    filaActual += 1;

    filas.forEach((fila) => {
        const row = hoja.getRow(filaActual);
        fila.forEach((valor, i) => {
            row.getCell(i + 1).value = valor === null || valor === undefined ? '' : valor;
        });
        filaActual += 1;
    });

    hoja.columns.forEach((columna) => {
        columna.width = 20;
    });

    return workbook.xlsx.writeBuffer();
}

module.exports = { generarExcelReporte };
