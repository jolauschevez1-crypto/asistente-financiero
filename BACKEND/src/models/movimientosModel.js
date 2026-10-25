/**
 * @file movimientosModel.js
 * @description Capa de modelo de negocio para movimientos financieros, interactuando con la base de datos a través de consultas centralizadas.
 */

const db = require('../config/db');
const logger = require('../utils/logger');
const movimientosQueries = require('../queries/movimientosQueries');
const { crearConstructorCondiciones, construirResultadoPaginado } = require('../utils/queryBuilder');
const { crearCache } = require('../utils/memCache');

const CLAVE_CACHE_CATEGORIAS = 'categorias';
const cacheCategorias = crearCache({ ttlMs: 10 * 60 * 1000 });

class MovimientosModel {
    /**
     * Busca un usuario por su telegram_id. Si no existe, delega su creación 
     * e inicialización completa a la función almacenada de Postgres.
     * @param {string} telegramId ID de Telegram del usuario.
     * @param {string} username Nombre de usuario de Telegram.
     * @param {string} nombre Nombre visible del usuario.
     */
    async buscarOCrearUsuario(telegramId, username, nombre) {
        try {
            const res = await db.query(movimientosQueries.BUSCAR_O_CREAR_USUARIO, [telegramId, username, nombre]);
            return res.rows[0];
        } catch (error) {
            logger.error('Error al invocar fx_buscar_o_crear_usuario:', error);
            throw error;
        }
    }

    /**
     * Busca un usuario activo por su id interno de base de datos.
     * @param {number} usuarioId ID interno de base de datos.
     */
    async buscarUsuarioPorId(usuarioId) {
        const res = await db.query(movimientosQueries.BUSCAR_USUARIO_POR_ID, [usuarioId]);
        return res.rows[0] || null;
    }

    /**
     * Registra un movimiento financiero usando el esquema real de la tabla movimientos.
     * Mantiene un control estricto de transacciones (BEGIN/COMMIT/ROLLBACK).
     * @param {object} datos Datos del movimiento financiero a registrar.
     */
    async registrarMovimiento(datos) { return require('../services/ledgerService').create(datos); }

    /**
     * Ejecuta el borrado lógico (Soft Delete) de un movimiento actualizando saldos asociados.
     * @param {number} movimientoId ID del movimiento a eliminar.
     * @param {number|null} usuarioId ID del usuario para filtro de seguridad.
     */
    async eliminarMovimientoWeb(movimientoId, usuarioId) { return require('../services/ledgerService').remove(movimientoId, usuarioId); }

    /**
     * Obtiene la lista de cuentas de un usuario con sus saldos.
     * @param {number} usuarioId ID del usuario.
     */
    async listarCuentas(usuarioId) {
        const res = await db.query(movimientosQueries.LISTAR_CUENTAS, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene una cuenta por nombre o la crea para el usuario indicado.
     * @param {string} nombre Nombre de la cuenta.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerOCrearCuenta(nombre, usuarioId) {
        const nombreNormalizado = String(nombre || '').trim();
        if (!nombreNormalizado || !usuarioId) {
            throw new Error('El nombre de la cuenta y el usuario son obligatorios.');
        }

        const existente = await db.query(movimientosQueries.OBTENER_CUENTA_DETALLADA, [nombreNormalizado, usuarioId]);

        if (existente.rows.length > 0) {
            return existente.rows[0];
        }

        const creada = await db.query(movimientosQueries.CREAR_CUENTA_DETALLADA, [nombreNormalizado, usuarioId]);

        return creada.rows[0];
    }

    /**
     * Crea una cuenta para el usuario sin duplicarla si ya existe.
     * @param {string} nombre Nombre de la cuenta.
     * @param {number} usuarioId ID del usuario.
     */
    async crearCuentaParaUsuario(nombre, usuarioId) {
        const nombreNormalizado = String(nombre || '').trim();
        if (!nombreNormalizado || !usuarioId) {
            throw new Error('El nombre de la cuenta y el usuario son obligatorios.');
        }

        const existente = await db.query(movimientosQueries.OBTENER_CUENTA_DETALLADA, [nombreNormalizado, usuarioId]);

        if (existente.rows.length > 0) {
            return { creado: false, cuenta: existente.rows[0] };
        }

        const creada = await db.query(movimientosQueries.CREAR_CUENTA_DETALLADA, [nombreNormalizado, usuarioId]);

        return { creado: true, cuenta: creada.rows[0] };
    }

    /**
     * Saldos por moneda de cartera. Nunca se suman monedas distintas.
     * @param {number} usuarioId ID del usuario.
     * @returns {Promise<{moneda:string,total:string}[]>}
     */
    async obtenerBalancesPorMoneda(usuarioId) {
        const res = await db.query(movimientosQueries.OBTENER_BALANCE_TOTAL, [usuarioId]);
        return res.rows.map(r => ({ moneda: r.moneda, total: String(r.total) }));
    }

    /**
     * Balance total solo si todas las carteras comparten moneda; con varias monedas devuelve null
     * (el total consolidado con tasas está en /api/finanzas/panel).
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerBalanceTotal(usuarioId) {
        const balances = await this.obtenerBalancesPorMoneda(usuarioId);
        if (balances.length === 0) return 0;
        return balances.length === 1 ? parseFloat(balances[0].total) : null;
    }

    /**
     * Obtiene el resumen de movimientos del día de hoy.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerResumenHoy(usuarioId) {
        const res = await db.query(movimientosQueries.OBTENER_RESUMEN_HOY, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene el resumen de movimientos del mes en curso.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerResumenMes(usuarioId) {
        const res = await db.query(movimientosQueries.OBTENER_RESUMEN_MES, [usuarioId]);
        return res.rows;
    }

    /**
     * Obtiene la suma de gastos por categoría en el mes actual.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerGastosCategoriaMes(usuarioId) {
        const res = await db.query(movimientosQueries.OBTENER_GASTOS_CATEGORIA_MES, [usuarioId]);
        return res.rows;
    }

    /**
     * Edita un movimiento existente y recalcula los saldos de las cuentas involucradas.
     * @param {number} movimientoId ID del movimiento.
     * @param {number} usuarioId ID del usuario propietario.
     * @param {object} datos Datos nuevos del movimiento.
     */
    async editarMovimiento(movimientoId, usuarioId, datos) { return require('../services/ledgerService').edit(movimientoId, usuarioId, datos); }

    /**
     * Obtiene el historial de los últimos 100 movimientos de un usuario.
     * Delegado completamente a la función fx_listar_historial_movimientos en PostgreSQL.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerHistorial(usuarioId) {
        try {
            const res = await db.query(movimientosQueries.OBTENER_HISTORIAL, [usuarioId]);
            return res.rows;
        } catch (error) {
            logger.error('Error al invocar fx_listar_historial_movimientos:', error);
            throw error;
        }
    }

    /**
     * Obtiene el historial de movimientos para administración.
     * @param {number} usuarioId ID del usuario.
     */
    async obtenerHistorialPorUsuarioAdmin(usuarioId) {
        return await this.obtenerHistorial(usuarioId);
    }

    /**
     * Version paginada del historial de un usuario (opt-in): a diferencia de
     * obtenerHistorial/obtenerHistorialPorUsuarioAdmin (fijas a los ultimos 100 via
     * fx_listar_historial_movimientos), permite pedir cualquier pagina reutilizando
     * listarMovimientosGlobalPaginado filtrado por usuarioId (mismas filas/orden que la
     * funcion almacenada, verificado). No reemplaza los metodos existentes.
     * @param {object} opts { usuarioId, page, limit }
     */
    async obtenerHistorialPaginado({ usuarioId, page = 1, limit = 100 } = {}) {
        return this.listarMovimientosGlobalPaginado({
            usuarioId, page, limit, sortBy: 'fecha', sortDir: 'desc', estado: 'activo',
        });
    }

    /**
     * Lista movimientos de TODOS los usuarios, paginados/ordenables/filtrables, para administración.
     * @param {object} opts { page, limit, sortBy, sortDir, usuarioId, categoria, tipo, montoMin, montoMax, estado, fechaDesde, fechaHasta, q }
     */
    async listarMovimientosGlobalPaginado({
        page = 1, limit = 20, sortBy = 'fecha', sortDir = 'desc',
        usuarioId, categoria, tipo, montoMin, montoMax, estado = 'activo',
        fechaDesde, fechaHasta, q, moneda,
    } = {}) {
        const { condiciones, valores, agregar, paginar } = crearConstructorCondiciones();

        if (estado === 'activo') condiciones.push('m.deleted_at IS NULL');
        else if (estado === 'eliminado') condiciones.push('m.deleted_at IS NOT NULL');
        // estado === 'todos' -> sin condición sobre deleted_at

        if (usuarioId) agregar('u.id = ?', usuarioId);
        if (moneda) agregar('m.moneda = ?', require('../finance/currency').validate(moneda));
        if (categoria) agregar('cat.nombre = ?', categoria);
        if (tipo) agregar('tm.nombre = ?', String(tipo).toUpperCase());
        if (montoMin !== undefined && montoMin !== null && montoMin !== '' && !isNaN(montoMin)) {
            agregar('m.monto >= ?', montoMin);
        }
        if (montoMax !== undefined && montoMax !== null && montoMax !== '' && !isNaN(montoMax)) {
            agregar('m.monto <= ?', montoMax);
        }
        if (fechaDesde) agregar('m.fecha >= ?', fechaDesde);
        if (fechaHasta) agregar('m.fecha < ?', fechaHasta);

        if (q) {
            agregar('(m.descripcion ILIKE ? OR u.nombre ILIKE ? OR u.correo ILIKE ? OR cat.nombre ILIKE ?)', `%${q}%`);
        }

        const ordenColumna = movimientosQueries.COLUMNAS_ORDENABLES_MOVIMIENTOS_GLOBAL[sortBy] || 'm.fecha';
        const ordenDireccion = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const { indexLimit, indexOffset } = paginar(page, limit);

        const query = movimientosQueries.GENERAR_LISTADO_PAGINADO_MOVIMIENTOS_GLOBAL({
            condiciones, ordenColumna, ordenDireccion, indexLimit, indexOffset,
        });

        const resultado = await db.query(query, valores);
        return construirResultadoPaginado(resultado, page, limit);
    }

    /**
     * Lista alfabética de nombres de categorías existentes (para el filtro del panel global).
     */
    async listarCategoriasDistintas() {
        return cacheCategorias.get(CLAVE_CACHE_CATEGORIAS, async () => {
            const res = await db.query(movimientosQueries.OBTENER_CATEGORIAS_DISTINCT);
            return res.rows.map((r) => r.nombre);
        });
    }

    /** Invalida el cache de categorias distintas (llamar tras crear una categoria nueva). */
    invalidarCacheCategorias() {
        cacheCategorias.invalidate(CLAVE_CACHE_CATEGORIAS);
    }

    /**
     * Obtiene un movimiento completo por ID (activo únicamente) para operaciones de administración.
     * @param {number} movimientoId
     */
    async obtenerMovimientoCompletoPorId(movimientoId) {
        const res = await db.query(movimientosQueries.OBTENER_MOVIMIENTO_COMPLETO_POR_ID, [movimientoId]);
        return res.rows[0] || null;
    }
}

module.exports = new MovimientosModel();
