// src/controllers/reportesAdminController.js
const adminModel = require('../models/adminModel');
const logger = require('../utils/logger');
const { filasACsv } = require('../utils/csv');
const { generarExcelReporte } = require('../utils/excel');
const { generarPdfReporte } = require('../utils/pdf');
const { resolverRangoFecha } = require('../utils/dateRangePresets');
const { tablaParaExportar, serieParaGrafico } = require('../dtos/reporteDto');

const TIPOS_VALIDOS = [
    'ingresos-mensuales', 'gastos-mensuales', 'balance-anual', 'balance-mensual',
    'top-usuarios', 'top-categorias', 'movimientos-usuario', 'movimientos-fecha', 'comparativas',
];

const TITULOS_REPORTE = {
    'ingresos-mensuales': 'Ingresos mensuales',
    'gastos-mensuales': 'Gastos mensuales',
    'balance-anual': 'Balance anual',
    'balance-mensual': 'Balance mensual',
    'top-usuarios': 'Top usuarios',
    'top-categorias': 'Top categorias',
    'movimientos-usuario': 'Movimientos por usuario',
    'movimientos-fecha': 'Movimientos por fecha',
    'comparativas': 'Comparativas de periodos',
};

/**
 * Resuelve los filtros del módulo de Reportes desde req.query, incluyendo presets de
 * rango de fecha propios de este módulo (distintos de los de Movimientos Global: aquí
 * se necesitan rangos anuales/mensuales completos para comparativas).
 * Compartido entre `generar` y `exportar`.
 */
function resolverFiltrosReporte(query) {
    const { anio, anioDesde, anioHasta, usuarioId, limite, preset } = query;
    let { fechaDesde, fechaHasta } = query;

    if (['mes-actual', 'mes-anterior', 'anio-actual', 'anio-anterior'].includes(preset)) {
        const rango = resolverRangoFecha(preset);
        fechaDesde = rango.fechaDesde.toISOString();
        fechaHasta = rango.fechaHasta.toISOString();
    }

    return {
        moneda: require('../finance/currency').validate(query.moneda),
        anio: anio ? parseInt(anio) : undefined,
        anioDesde: anioDesde ? parseInt(anioDesde) : undefined,
        anioHasta: anioHasta ? parseInt(anioHasta) : undefined,
        usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
        limite: limite ? parseInt(limite) : undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
    };
}

class ReportesAdminController {
    /**
     * Genera los datos de un reporte (JSON) para renderizar KPIs + gráfico + tabla en Angular.
     * Ruta: GET /api/reportes/admin/generar
     */
    async generar(req, res, next) {
        try {
            const { tipo } = req.query;
            if (!TIPOS_VALIDOS.includes(tipo)) {
                return res.status(400).json({ success: false, message: `Tipo de reporte invalido: ${tipo}` });
            }

            const filtros = resolverFiltrosReporte(req.query);
            const resultado = await adminModel.obtenerDatosReporte(tipo, filtros);

            return res.status(200).json({ success: true, data: resultado });
        } catch (error) {
            logger.error(`Error al generar reporte (${req.query.tipo}):`, error);
            next(error);
        }
    }

    /**
     * Exporta un reporte a CSV, Excel o PDF, con los mismos filtros que `generar`.
     * Ruta: GET /api/reportes/admin/exportar
     */
    async exportar(req, res, next) {
        try {
            const { tipo, formato = 'csv' } = req.query;
            if (!TIPOS_VALIDOS.includes(tipo)) {
                return res.status(400).json({ success: false, message: `Tipo de reporte invalido: ${tipo}` });
            }

            const filtros = resolverFiltrosReporte(req.query);
            const resultado = await adminModel.obtenerDatosReporte(tipo, filtros);
            const titulo = `${TITULOS_REPORTE[tipo] || 'Reporte'} (${resultado.moneda})`;
            const tabla = tablaParaExportar(tipo, resultado.datos);
            const encabezados = ['Moneda', ...tabla.encabezados];
            const filas = tabla.filas.map(fila => [resultado.moneda, ...fila]);
            const nombreArchivo = `reporte-${tipo}-${resultado.moneda}`;
            res.setHeader('X-Currency',resultado.moneda);

            if (formato === 'excel') {
                const buffer = await generarExcelReporte({ titulo, encabezados, filas, resumen: resultado.resumen });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.xlsx"`);
                return res.status(200).send(Buffer.from(buffer));
            }

            if (formato === 'pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.pdf"`);
                const chartSeries = serieParaGrafico(tipo, resultado);
                generarPdfReporte({ res, titulo, resumen: resultado.resumen, chartSeries, encabezados, filas });
                return;
            }

            const csv = filasACsv(encabezados, filas);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.csv"`);
            return res.status(200).send(csv);
        } catch (error) {
            logger.error(`Error al exportar reporte (${req.query.tipo}):`, error);
            next(error);
        }
    }
}

module.exports = new ReportesAdminController();
