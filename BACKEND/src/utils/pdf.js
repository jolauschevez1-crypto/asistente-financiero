/**
 * @file pdf.js
 * @description Generador genérico de reportes en PDF (título, resumen, gráfico de barras
 * vectorial simple y tabla de detalle) con pdfkit. Hace pipe directo a la respuesta HTTP.
 */
const PDFDocument = require('pdfkit');

/**
 * @param {object} opts
 * @param {import('express').Response} opts.res Respuesta HTTP donde se hace pipe del PDF.
 * @param {string} opts.titulo Título del reporte.
 * @param {Record<string, string|number|null>} [opts.resumen] Pares clave/valor de KPIs.
 * @param {{categorias: string[], valores: number[]}} [opts.chartSeries] Serie única para el gráfico de barras.
 * @param {string[]} [opts.encabezados] Encabezados de la tabla de detalle.
 * @param {Array<Array<string|number|null>>} [opts.filas] Filas de la tabla de detalle.
 */
function generarPdfReporte({ res, titulo, resumen = {}, chartSeries, encabezados = [], filas = [] }) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(18).fillColor('#0f172a').text(titulo);
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor('#64748b').text(`Generado: ${new Date().toLocaleString('es-ES')}`);
    doc.moveDown(0.8);

    const entradasResumen = Object.entries(resumen).filter(([, valor]) => valor !== null && valor !== undefined);
    if (entradasResumen.length > 0) {
        doc.fontSize(12).fillColor('#0f172a').text('Resumen', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#1e293b');
        entradasResumen.forEach(([clave, valor]) => doc.text(`${clave}: ${valor}`));
        doc.moveDown(0.8);
    }

    if (chartSeries && chartSeries.categorias?.length) {
        doc.fontSize(12).fillColor('#0f172a').text('Grafico', { underline: true });
        doc.moveDown(0.3);
        dibujarGraficoBarras(doc, chartSeries);
        doc.moveDown(1);
    }

    if (encabezados.length > 0) {
        doc.fontSize(12).fillColor('#0f172a').text('Detalle', { underline: true });
        doc.moveDown(0.3);
        dibujarTabla(doc, encabezados, filas);
    }

    doc.end();
}

function dibujarGraficoBarras(doc, { categorias, valores }) {
    const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const alturaGrafico = 140;
    const anchoBarra = Math.min(40, anchoDisponible / (categorias.length * 1.5 || 1));
    const maxValor = Math.max(...valores.map((v) => Math.abs(Number(v) || 0)), 1);
    const xInicial = doc.page.margins.left;
    const yBase = doc.y + alturaGrafico;

    categorias.forEach((categoria, i) => {
        const valor = Number(valores[i]) || 0;
        const alturaBarra = (Math.abs(valor) / maxValor) * alturaGrafico;
        const x = xInicial + i * (anchoBarra + 10);
        const y = yBase - alturaBarra;
        doc.rect(x, y, anchoBarra, Math.max(alturaBarra, 1)).fill(valor >= 0 ? '#0f766e' : '#f87171');
        doc.fontSize(7).fillColor('#334155').text(String(categoria).slice(0, 8), x - 5, yBase + 4, {
            width: anchoBarra + 10,
            align: 'center',
        });
    });

    doc.y = yBase + 20;
    doc.x = xInicial;
}

function dibujarTabla(doc, encabezados, filas) {
    const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const anchoColumna = anchoDisponible / encabezados.length;
    const xInicial = doc.page.margins.left;
    let y = doc.y;

    const dibujarFila = (valores, esEncabezado) => {
        if (esEncabezado) {
            doc.rect(xInicial, y, anchoDisponible, 18).fill('#0f172a');
        }
        doc.fontSize(8)
            .font(esEncabezado ? 'Helvetica-Bold' : 'Helvetica')
            .fillColor(esEncabezado ? '#ffffff' : '#1e293b');
        valores.forEach((valor, i) => {
            doc.text(valor === null || valor === undefined ? '' : String(valor), xInicial + i * anchoColumna + 2, y + 5, {
                width: anchoColumna - 4,
                height: 14,
                ellipsis: true,
            });
        });
        y += 18;
    };

    dibujarFila(encabezados, true);
    const filasLimitadas = filas.slice(0, 400);
    filasLimitadas.forEach((fila) => {
        if (y > doc.page.height - doc.page.margins.bottom - 20) {
            doc.addPage();
            y = doc.page.margins.top;
        }
        dibujarFila(fila, false);
    });

    doc.y = y + 10;
    doc.x = xInicial;
}

module.exports = { generarPdfReporte };
