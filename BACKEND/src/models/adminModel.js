// src/models/adminModel.js
const db = require('../config/db');
const adminQueries = require('../queries/adminQueries');
const currency = require('../finance/currency');
const movimientosModel = require('./movimientosModel');
const { crearCache } = require('../utils/memCache');

const CLAVE_CACHE_DASHBOARD = 'dashboard';
const cacheDashboard = crearCache({ ttlMs: 60 * 1000 });

class AdminModel {
    /**
     * Extrae el conteo total de usuarios y movimientos activos del sistema.
     */
    async obtenerEstadisticasGenerales(moneda = 'USD') {
        currency.validate(moneda);
        const resUsuarios = await currency.query(db, adminQueries.OBTENER_TOTAL_USUARIOS, [], moneda);
        const resMovimientos = await currency.query(db, adminQueries.OBTENER_TOTAL_MOVIMIENTOS, [], moneda);

        return {
            moneda,
            usuariosRegistrados: parseInt(resUsuarios.rows[0].total_usuarios),
            movimientosTotales: parseInt(resMovimientos.rows[0].total_movimientos)
        };
    }

    /**
     * Calcula la variación porcentual entre el valor actual y el anterior.
     * Devuelve null cuando no hay base de comparación (evita división por cero).
     */
    _calcularVariacion(actual, anterior) {
        const valorActual = Number(actual);
        const valorAnterior = Number(anterior);
        if (!valorAnterior) return null;
        return Math.round(((valorActual - valorAnterior) / Math.abs(valorAnterior)) * 1000) / 10;
    }

    /**
     * Reúne todas las métricas, gráficos y actividad reciente para el Dashboard Administrativo.
     * Ejecuta todas las consultas en paralelo para minimizar la latencia.
     */
    async obtenerMetricasDashboard(moneda = 'USD') {
        currency.validate(moneda);
        return cacheDashboard.get(`${CLAVE_CACHE_DASHBOARD}:${moneda}`, async () => this._obtenerMetricasDashboardSinCache(moneda));
    }

    /** Cuerpo real de obtenerMetricasDashboard, sin la capa de cache (60s, ver memCache.js). */
    async _obtenerMetricasDashboardSinCache(moneda = 'USD') {
        const [
            balanceGlobalRes,
            balanceDisponibleRes,
            flujoMensualRes,
            usuariosActivosRes,
            usuariosRegistradosRes,
            usuariosNuevosRes,
            movimientosTotalesRes,
            movimientosMensualRes,
            ultimosMovimientosRes,
            ultimosUsuariosRes,
            ultimosLoginsRes,
            balanceMensualRes,
            movimientosPorDiaRes,
            categoriasRes,
            topUsuariosRes,
        ] = await Promise.all([
            currency.query(db, adminQueries.OBTENER_BALANCE_GLOBAL, [], moneda),
            currency.query(db, adminQueries.OBTENER_BALANCE_DISPONIBLE, [], moneda),
            currency.query(db, adminQueries.OBTENER_FLUJO_MENSUAL, [], moneda),
            currency.query(db, adminQueries.OBTENER_TOTAL_USUARIOS, [], moneda),
            currency.query(db, adminQueries.OBTENER_TOTAL_USUARIOS_REGISTRADOS, [], moneda),
            currency.query(db, adminQueries.OBTENER_USUARIOS_NUEVOS_MENSUAL, [], moneda),
            currency.query(db, adminQueries.OBTENER_TOTAL_MOVIMIENTOS, [], moneda),
            currency.query(db, adminQueries.OBTENER_MOVIMIENTOS_MENSUAL, [], moneda),
            currency.query(db, adminQueries.OBTENER_ULTIMOS_MOVIMIENTOS, [], moneda),
            currency.query(db, adminQueries.OBTENER_ULTIMOS_USUARIOS, [], moneda),
            currency.query(db, adminQueries.OBTENER_ULTIMOS_LOGINS, [], moneda),
            currency.query(db, adminQueries.OBTENER_BALANCE_MENSUAL, [], moneda),
            currency.query(db, adminQueries.OBTENER_MOVIMIENTOS_POR_DIA, [], moneda),
            currency.query(db, adminQueries.OBTENER_CATEGORIAS_MAS_USADAS, [], moneda),
            currency.query(db, adminQueries.OBTENER_TOP_USUARIOS, [], moneda),
        ]);

        const flujo = { INGRESO: { actual: 0, anterior: 0 }, GASTO: { actual: 0, anterior: 0 } };
        flujoMensualRes.rows.forEach((fila) => {
            flujo[fila.tipo] = { actual: Number(fila.monto_actual), anterior: Number(fila.monto_anterior) };
        });

        const ingresoActual = flujo.INGRESO.actual;
        const ingresoAnterior = flujo.INGRESO.anterior;
        const gastoActual = flujo.GASTO.actual;
        const gastoAnterior = flujo.GASTO.anterior;
        const netoActual = ingresoActual - gastoActual;
        const netoAnterior = ingresoAnterior - gastoAnterior;

        const usuariosNuevos = usuariosNuevosRes.rows[0];
        const movimientosMensual = movimientosMensualRes.rows[0];

        return {
            moneda,
            kpis: {
                balanceGlobal: { valor: Number(balanceGlobalRes.rows[0].balance_global), variacion: null },
                balanceDisponible: { valor: Number(balanceDisponibleRes.rows[0].balance_disponible), variacion: null },
                ingresosMes: { valor: ingresoActual, variacion: this._calcularVariacion(ingresoActual, ingresoAnterior) },
                gastosMes: { valor: gastoActual, variacion: this._calcularVariacion(gastoActual, gastoAnterior) },
                usuariosRegistrados: {
                    valor: parseInt(usuariosRegistradosRes.rows[0].total_usuarios_registrados),
                    variacion: this._calcularVariacion(usuariosNuevos.nuevos_mes_actual, usuariosNuevos.nuevos_mes_anterior),
                },
                usuariosActivos: { valor: parseInt(usuariosActivosRes.rows[0].total_usuarios), variacion: null },
                cantidadMovimientos: {
                    valor: parseInt(movimientosTotalesRes.rows[0].total_movimientos),
                    variacion: this._calcularVariacion(movimientosMensual.movimientos_mes_actual, movimientosMensual.movimientos_mes_anterior),
                },
                variacionMensual: { valor: this._calcularVariacion(netoActual, netoAnterior) ?? 0, variacion: null },
            },
            actividadReciente: {
                ultimosMovimientos: ultimosMovimientosRes.rows,
                ultimosUsuarios: ultimosUsuariosRes.rows,
                ultimosLogins: ultimosLoginsRes.rows,
            },
            charts: {
                tendenciaMensual: balanceMensualRes.rows,
                movimientosPorDia: movimientosPorDiaRes.rows,
                categoriasMasUsadas: categoriasRes.rows,
                topUsuarios: topUsuariosRes.rows,
            },
        };
    }

    // ==========================================
    // MÓDULO DE REPORTES
    // ==========================================

    /**
     * Dispatcher central del módulo de Reportes: según `tipo`, arma una forma uniforme
     * { resumen, datos, chartDatos? }. `chartDatos` solo se incluye cuando `datos` no es
     * directamente compatible con los chart-builders existentes (movimientos-usuario/fecha).
     * @param {string} tipo Uno de los 9 tipos de reporte soportados.
     * @param {object} filtros Filtros ya resueltos por el controlador (fechas ISO, año, etc).
     */
    async obtenerDatosReporte(tipo, filtros = {}) {
        const moneda=currency.validate(filtros.moneda);
        const result=await this._obtenerDatosReporte(tipo,{...filtros,moneda});
        return {...result,moneda,resumen:{...result.resumen,moneda}};
    }

    async _obtenerDatosReporte(tipo, filtros = {}) {
        switch (tipo) {
            case 'ingresos-mensuales':
            case 'gastos-mensuales':
            case 'balance-mensual':
                return this._reporteSerieMensual(filtros);
            case 'balance-anual':
                return this._reporteSerieAnual(filtros);
            case 'top-usuarios':
                return this._reporteTopUsuarios(filtros);
            case 'top-categorias':
                return this._reporteTopCategorias(filtros);
            case 'movimientos-usuario':
            case 'movimientos-fecha':
                return this._reporteMovimientosDetalle(filtros);
            case 'comparativas':
                return this._reporteComparativas(filtros);
            default:
                throw new Error(`Tipo de reporte no soportado: ${tipo}`);
        }
    }

    /**
     * Serie mensual (12 meses, huecos rellenados con 0) de un año arbitrario.
     * Cubre ingresos-mensuales / gastos-mensuales / balance-mensual.
     */
    async _reporteSerieMensual({ anio, moneda = 'USD' } = {}) {
        const anioResuelto = Number(anio) || new Date().getFullYear();
        const res = await currency.query(db, adminQueries.OBTENER_SERIE_MENSUAL_POR_ANIO, [anioResuelto], moneda);
        const porMes = new Map(res.rows.map((fila) => [new Date(fila.mes).getUTCMonth() + 1, fila]));

        const datos = [];
        for (let mes = 1; mes <= 12; mes++) {
            const fila = porMes.get(mes);
            const ingresos = Number(fila?.ingresos || 0);
            const gastos = Number(fila?.gastos || 0);
            datos.push({ mes: `${anioResuelto}-${String(mes).padStart(2, '0')}-01`, ingresos, gastos });
        }

        const totalIngresos = datos.reduce((s, d) => s + d.ingresos, 0);
        const totalGastos = datos.reduce((s, d) => s + d.gastos, 0);

        return {
            resumen: { anio: anioResuelto, totalIngresos, totalGastos, balanceNeto: totalIngresos - totalGastos },
            datos,
        };
    }

    /**
     * Serie anual (huecos rellenados con 0) de un rango de años. Cubre balance-anual.
     */
    async _reporteSerieAnual({ anioDesde, anioHasta, moneda = 'USD' } = {}) {
        const anioActual = new Date().getFullYear();
        const desde = Number(anioDesde) || anioActual - 4;
        const hasta = Number(anioHasta) || anioActual;

        const res = await currency.query(db, adminQueries.OBTENER_SERIE_ANUAL, [desde, hasta], moneda);
        const porAnio = new Map(res.rows.map((fila) => [Number(fila.anio), fila]));

        const datos = [];
        for (let anio = desde; anio <= hasta; anio++) {
            const fila = porAnio.get(anio);
            const ingresos = Number(fila?.ingresos || 0);
            const gastos = Number(fila?.gastos || 0);
            datos.push({ anio, ingresos, gastos, balance: ingresos - gastos });
        }

        const totalIngresos = datos.reduce((s, d) => s + d.ingresos, 0);
        const totalGastos = datos.reduce((s, d) => s + d.gastos, 0);

        return {
            resumen: { anioDesde: desde, anioHasta: hasta, totalIngresos, totalGastos, balanceNeto: totalIngresos - totalGastos },
            datos,
        };
    }

    /**
     * Rango de fechas por defecto (mes calendario actual) cuando el reporte no especifica uno.
     */
    _resolverRangoPorDefecto(fechaDesde, fechaHasta) {
        if (fechaDesde && fechaHasta) return { desde: fechaDesde, hasta: fechaHasta };
        const ahora = new Date();
        const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
        return { desde: desde.toISOString(), hasta: hasta.toISOString() };
    }

    /** Top usuarios por volumen de movimientos en un rango arbitrario. */
    async _reporteTopUsuarios({ fechaDesde, fechaHasta, limite, moneda = 'USD' } = {}) {
        const { desde, hasta } = this._resolverRangoPorDefecto(fechaDesde, fechaHasta);
        const top = Math.min(parseInt(limite) || 10, 50);
        const res = await currency.query(db, adminQueries.OBTENER_TOP_USUARIOS_RANGO, [desde, hasta, top], moneda);

        const datos = res.rows.map((fila) => ({
            id: fila.id, nombre: fila.nombre, correo: fila.correo,
            cantidad_movimientos: Number(fila.cantidad_movimientos),
            monto_total: Number(fila.monto_total),
        }));

        return {
            resumen: {
                fechaDesde: desde, fechaHasta: hasta,
                totalUsuarios: datos.length,
                totalMovimientos: datos.reduce((s, d) => s + d.cantidad_movimientos, 0),
                totalMonto: datos.reduce((s, d) => s + d.monto_total, 0),
            },
            datos,
        };
    }

    /** Categorías más usadas en un rango arbitrario. */
    async _reporteTopCategorias({ fechaDesde, fechaHasta, limite, moneda = 'USD' } = {}) {
        const { desde, hasta } = this._resolverRangoPorDefecto(fechaDesde, fechaHasta);
        const top = Math.min(parseInt(limite) || 10, 50);
        const res = await currency.query(db, adminQueries.OBTENER_CATEGORIAS_RANGO, [desde, hasta, top], moneda);

        const datos = res.rows.map((fila) => ({
            categoria: fila.categoria,
            cantidad: Number(fila.cantidad),
            monto_total: Number(fila.monto_total),
        }));

        return {
            resumen: {
                fechaDesde: desde, fechaHasta: hasta,
                totalCategorias: datos.length,
                totalMovimientos: datos.reduce((s, d) => s + d.cantidad, 0),
                totalMonto: datos.reduce((s, d) => s + d.monto_total, 0),
            },
            datos,
        };
    }

    /**
     * Listado detallado de movimientos (por usuario o por rango de fechas), reutilizando
     * movimientosModel.listarMovimientosGlobalPaginado tal cual (sin SQL nueva). El chart
     * se arma agregando esas mismas filas por día en JS, ya que la lista cruda no es
     * directamente compatible con los chart-builders de barras/dona existentes.
     */
    async _reporteMovimientosDetalle({ usuarioId, fechaDesde, fechaHasta, moneda = 'USD' } = {}) {
        const resultado = await movimientosModel.listarMovimientosGlobalPaginado({
            page: 1, limit: 5000, sortBy: 'fecha', sortDir: 'asc',
            usuarioId, fechaDesde, fechaHasta, estado: 'activo', moneda,
        });

        const datos = resultado.data;
        const totalIngresos = datos.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + Number(m.monto), 0);
        const totalGastos = datos.filter((m) => m.tipo === 'GASTO').reduce((s, m) => s + Number(m.monto), 0);

        const porDia = new Map();
        datos.forEach((m) => {
            const dia = new Date(m.fecha).toISOString().slice(0, 10);
            const actual = porDia.get(dia) || { dia, cantidad: 0, monto_total: 0 };
            actual.cantidad += 1;
            actual.monto_total += Number(m.monto);
            porDia.set(dia, actual);
        });
        const chartDatos = [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia));

        return {
            resumen: {
                usuarioId: usuarioId || null,
                fechaDesde: fechaDesde || null,
                fechaHasta: fechaHasta || null,
                cantidadMovimientos: datos.length,
                totalIngresos, totalGastos, balance: totalIngresos - totalGastos,
            },
            datos,
            chartDatos,
        };
    }

    /**
     * Compara dos periodos (actual vs anterior). Si no se especifica un rango, usa el
     * mes calendario actual vs el mes calendario anterior de igual duración.
     */
    async _reporteComparativas({ fechaDesde, fechaHasta, fechaDesdeAnterior, fechaHastaAnterior, moneda = 'USD' } = {}) {
        const ahora = new Date();
        const desdeActual = fechaDesde ? new Date(fechaDesde) : new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const hastaActual = fechaHasta ? new Date(fechaHasta) : new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
        const duracionMs = hastaActual.getTime() - desdeActual.getTime();
        const desdeAnterior = fechaDesdeAnterior ? new Date(fechaDesdeAnterior) : new Date(desdeActual.getTime() - duracionMs);
        const hastaAnterior = fechaHastaAnterior ? new Date(fechaHastaAnterior) : desdeActual;

        const [actualRes, anteriorRes] = await Promise.all([
            currency.query(db, adminQueries.OBTENER_RESUMEN_RANGO, [desdeActual.toISOString(), hastaActual.toISOString()], moneda),
            currency.query(db, adminQueries.OBTENER_RESUMEN_RANGO, [desdeAnterior.toISOString(), hastaAnterior.toISOString()], moneda),
        ]);

        const actual = actualRes.rows[0] || {};
        const anterior = anteriorRes.rows[0] || {};
        const ingresosActual = Number(actual.ingresos || 0);
        const gastosActual = Number(actual.gastos || 0);
        const ingresosAnterior = Number(anterior.ingresos || 0);
        const gastosAnterior = Number(anterior.gastos || 0);
        const balanceActual = ingresosActual - gastosActual;
        const balanceAnterior = ingresosAnterior - gastosAnterior;

        const datos = [
            {
                periodo: 'Periodo anterior', ingresos: ingresosAnterior, gastos: gastosAnterior,
                balance: balanceAnterior, cantidadMovimientos: Number(anterior.cantidad_movimientos || 0),
            },
            {
                periodo: 'Periodo actual', ingresos: ingresosActual, gastos: gastosActual,
                balance: balanceActual, cantidadMovimientos: Number(actual.cantidad_movimientos || 0),
            },
        ];

        return {
            resumen: {
                ingresosActual, ingresosAnterior,
                gastosActual, gastosAnterior,
                balanceActual, balanceAnterior,
                variacionIngresos: this._calcularVariacion(ingresosActual, ingresosAnterior),
                variacionGastos: this._calcularVariacion(gastosActual, gastosAnterior),
                variacionBalance: this._calcularVariacion(balanceActual, balanceAnterior),
            },
            datos,
        };
    }
}

module.exports = new AdminModel();
