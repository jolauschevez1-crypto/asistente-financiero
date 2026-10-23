// src/controllers/movimientosController.js
const movimientosService = require('../services/movimientosService');
const movimientosModel = require('../models/movimientosModel');
const logger = require('../utils/logger');
const { filasACsv, neutralizarCeldaTexto } = require('../utils/csv');
const { resolverRangoFecha } = require('../utils/dateRangePresets');
const { mapMovimiento, mapMovimientos } = require('../dtos/movimientoDto');
const { registrarAuditoria } = require('../utils/auditoria');

const LIMITE_EXPORT_CSV = 5000;

/**
 * Resuelve los filtros comunes del listado global de movimientos desde req.query,
 * incluyendo el mapeo de presets de rango de fecha (hoy/semana/mes/anio) a
 * fechaDesde/fechaHasta concretos via dateRangePresets. Compartido entre
 * listarGlobalAdmin y exportarCsvAdmin.
 */
function resolverFiltrosMovimientosGlobal(query) {
    const {
        usuarioId, categoria, tipo, montoMin, montoMax, estado, q, rangoFecha
    } = query;

    const { fechaDesde, fechaHasta } = resolverRangoFecha(rangoFecha);

    return {
        moneda: require('../finance/currency').validate(query.moneda),
        usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
        categoria: categoria || undefined,
        tipo: tipo || undefined,
        montoMin: montoMin !== undefined ? parseFloat(montoMin) : undefined,
        montoMax: montoMax !== undefined ? parseFloat(montoMax) : undefined,
        estado: estado || 'activo',
        fechaDesde: fechaDesde ? fechaDesde.toISOString() : undefined,
        fechaHasta: fechaHasta ? fechaHasta.toISOString() : undefined,
        q: q || undefined,
    };
}

class MovimientosController {
    /**
     * Registra un movimiento financiero.
     * @route POST /api/movimientos
     */
    async registrar(req, res, next) {
        try {
            const {
                telegram_id,
                username,
                nombre,
                tipo,
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            } = req.body;

            const usuarioId = req.usuario.id || null;

            if (!tipo || !monto) {
                return res.status(400).json({
                    success: false,
                    message: 'Los campos tipo y monto son obligatorios.'
                });
            }

            const result = await movimientosService.registrarMovimiento({
                usuario_id: usuarioId,
                telegram_id,
                username,
                nombre,
                tipo,
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            });

            if (result.status === 'SALDO_INSUFICIENTE') {
                return res.status(400).json({
                    success: false,
                    message: `No tienes saldo suficiente en ${result.cuenta}. Faltan $${result.faltante.toFixed(2)}.`,
                    data: result
                });
            }

            logger.info(`Movimiento registrado por usuario ${usuarioId}: tipo=${tipo}, monto=${monto}.`);
            return res.status(201).json({
                success: true,
                message: 'Movimiento registrado correctamente.',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Crea una cuenta nueva para el usuario autenticado.
     * @route POST /api/movimientos/cuentas
     */
    async crearCuenta(req, res, next) {
        try {
            const { nombre } = req.body;
            const usuarioId = req.usuario.id || null;

            if (!nombre || !usuarioId) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la cuenta y el usuario son obligatorios.'
                });
            }

            const result = await movimientosService.crearCuenta({ usuario_id: usuarioId, nombre });
            if (result.creado) {
                logger.info(`Cuenta "${nombre}" creada por usuario ${usuarioId}.`);
            }
            return res.status(result.creado ? 201 : 200).json({
                success: true,
                message: result.creado ? 'Cuenta creada correctamente.' : 'La cuenta ya existe.',
                data: result.cuenta
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene la lista de cuentas y saldo total.
     * @route GET /api/movimientos/cuentas
     */
    async obtenerCuentas(req, res, next) {
        try {
            const { telegram_id } = req.query;
            
            // 1. Nuestra meta absoluta: conseguir un ID interno de base de datos (Ej: 4)
            let idInterno = req.usuario?.id || null;

            // 2. Si no hay token web (req.usuario es null), pero nos enviaron un telegram_id: "Traducimos"
            if (!idInterno && telegram_id) {
                // Reusamos tu función inteligente de Postgres. Si ya existía, nos devuelve su ID interno (4). 
                // Si no existía, lo crea en el acto. Cero riesgos.
                const usuarioDB = await movimientosModel.buscarOCrearUsuario(telegram_id, 'telegram_client', 'Usuario');
                idInterno = usuarioDB.id;
            }

            // 3. Si después de intentar ambos caminos seguimos en null, alguien intenta entrar sin credenciales
            if (!idInterno) {
                return res.status(401).json({
                    success: false,
                    message: 'No se pudo identificar al usuario para consultar sus cuentas.'
                });
            }

            // 4. A partir de esta línea, el Servicio vive feliz porque SIEMPRE recibe un entero pequeño (Ej: 4)
            const result = await movimientosService.listarCuentasUsuario(idInterno);
            
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Edita un movimiento desde el panel administrativo web (Angular).
     * @route PUT /api/movimientos/:id
     */
    async editarWeb(req, res, next) {
        try {
            const movimientoId = parseInt(req.params.id);
            const usuarioId = req.usuario.id;

            const {
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            } = req.body;

            const movimientoActualizado = await movimientosModel.editarMovimiento(movimientoId, usuarioId, {
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            });

            logger.info(`Movimiento ${movimientoId} editado por usuario ${usuarioId}.`);
            return res.status(200).json({
                success: true,
                message: 'Movimiento actualizado correctamente. Los saldos han sido recalculados.',
                data: mapMovimiento(movimientoActualizado)
            });

        } catch (error) {
            logger.error(`Error en editarWeb (Movimiento ID: ${req.params.id}):`, error);

            if (error.message && (error.message.includes('Se requiere') || error.message.includes('Faltan'))) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            next(error);
        }
    }

    /**
     * Elimina logicamente un movimiento (Soft Delete) desde el panel web.
     * @route DELETE /api/movimientos/:id
     */
    async eliminarWeb(req, res, next) {
        try {
            const movimientoId = parseInt(req.params.id);

            const resultado = await movimientosModel.eliminarMovimientoWeb(movimientoId, req.usuario.id);

            logger.info(`Movimiento ${movimientoId} eliminado por usuario ${req.usuario.id}.`);
            return res.status(200).json({
                success: true,
                message: resultado.message // "Movimiento enviado a la papelera correctamente."
            });

        } catch (error) {
            logger.error(`Error en eliminarWeb (Movimiento ID: ${req.params.id}):`, error);
            next(error);
        }
    }

    /**
     * Obtiene el historial de movimientos para la tabla del panel web. Sin `page`/`limit` en
     * el query, mantiene el comportamiento actual (ultimos 100, sin meta). Con alguno de los
     * dos presentes, usa el nuevo camino paginado y agrega `meta` a la respuesta.
     * @route GET /api/movimientos
     */
    async obtenerHistorialWeb(req, res, next) {
        try {
            const usuarioId = req.usuario.id;
            const { page, limit } = req.query;

            if (page === undefined && limit === undefined) {
                const historial = await movimientosModel.obtenerHistorial(usuarioId);
                return res.status(200).json({
                    success: true,
                    data: mapMovimientos(historial)
                });
            }

            const resultado = await movimientosModel.obtenerHistorialPaginado({
                usuarioId,
                page: parseInt(page) || 1,
                limit: Math.min(parseInt(limit) || 100, 100),
            });

            return res.status(200).json({
                success: true,
                data: mapMovimientos(resultado.data),
                moneda: req.usuario.moneda,
                meta: { total: resultado.total, page: resultado.page, limit: resultado.limit },
            });
        } catch (error) {
            logger.error('Error al obtener historial de movimientos:', error);
            next(error);
        }
    }

    // ==========================================
    // ADMINISTRACIÓN GLOBAL (todos los usuarios)
    // ==========================================

    /**
     * Lista TODOS los movimientos (todos los usuarios), paginados/ordenables/filtrables.
     * Ruta: GET /api/movimientos/admin/todos
     */
    async listarGlobalAdmin(req, res, next) {
        try {
            const { page = 1, limit = 20, sortBy = 'fecha', sortDir = 'desc' } = req.query;
            const filtros = resolverFiltrosMovimientosGlobal(req.query);

            const resultado = await movimientosModel.listarMovimientosGlobalPaginado({
                page: parseInt(page) || 1,
                limit: Math.min(parseInt(limit) || 20, 100),
                sortBy, sortDir,
                ...filtros,
            });

            res.status(200).json({
                success: true,
                moneda: filtros.moneda,
                data: mapMovimientos(resultado.data),
                meta: { total: resultado.total, page: resultado.page, limit: resultado.limit },
            });
        } catch (error) { next(error); }
    }

    /**
     * Lista alfabética de categorías para el filtro del panel global.
     * Ruta: GET /api/movimientos/admin/categorias
     */
    async listarCategoriasGlobalAdmin(req, res, next) {
        try {
            const categorias = await movimientosModel.listarCategoriasDistintas();
            res.status(200).json({ success: true, data: categorias });
        } catch (error) { next(error); }
    }

    /**
     * Duplica un movimiento existente (nueva fila, fecha = NOW(), saldos recalculados).
     * Ruta: POST /api/movimientos/admin/:id/duplicar
     */
    async duplicarAdmin(req, res, next) {
        try {
            const movimientoId = parseInt(req.params.id);

            const resultado = await movimientosService.duplicarMovimiento(movimientoId);

            if (resultado.status === 'SALDO_INSUFICIENTE') {
                return res.status(400).json({
                    success: false,
                    message: `No hay saldo suficiente en ${resultado.cuenta}. Faltan $${resultado.faltante.toFixed(2)}.`,
                    data: resultado,
                });
            }

            logger.info(`Movimiento ${movimientoId} duplicado por admin (nuevo id ${resultado.movimiento.id}).`);
            await registrarAuditoria(req, { accion: 'MOVIMIENTO_DUPLICADO', entidad: 'movimientos', entidadId: resultado.movimiento.id, detalle: { movimientoOriginal: movimientoId } });
            return res.status(201).json({
                success: true,
                message: 'Movimiento duplicado correctamente.',
                data: mapMovimiento(resultado.movimiento),
            });
        } catch (error) {
            if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
            next(error);
        }
    }

    /**
     * Exporta a CSV los movimientos que cumplen los mismos filtros del listado global,
     * ignorando paginación pero acotado a LIMITE_EXPORT_CSV filas.
     * Ruta: GET /api/movimientos/admin/exportar
     */
    async exportarCsvAdmin(req, res, next) {
        try {
            const { sortBy = 'fecha', sortDir = 'desc' } = req.query;
            const filtros = resolverFiltrosMovimientosGlobal(req.query);

            const resultado = await movimientosModel.listarMovimientosGlobalPaginado({
                page: 1, limit: LIMITE_EXPORT_CSV, sortBy, sortDir, ...filtros,
            });

            const encabezados = ['ID', 'Fecha', 'Usuario', 'Correo', 'Categoria', 'Tipo', 'Moneda', 'Monto', 'Descripcion', 'Cuenta origen', 'Cuenta destino', 'Estado'];
            const filas = resultado.data.map((m) => [
                m.id, m.fecha, neutralizarCeldaTexto(m.usuario_nombre), neutralizarCeldaTexto(m.usuario_correo),
                neutralizarCeldaTexto(m.categoria), m.tipo, m.moneda, m.monto, neutralizarCeldaTexto(m.descripcion),
                neutralizarCeldaTexto(m.cuenta_origen), neutralizarCeldaTexto(m.cuenta_destino),
                m.deleted_at ? 'Eliminado' : 'Activo',
            ]);

            const csv = filasACsv(encabezados, filas);

            logger.info(`Exportacion CSV de movimientos globales generada por admin (${resultado.data.length} filas).`);
            await registrarAuditoria(req, { accion: 'EXPORT_CSV_MOVIMIENTOS', entidad: 'movimientos', detalle: { filas: resultado.data.length } });
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="movimientos-${filtros.moneda}.csv"`);
            res.setHeader('X-Currency', filtros.moneda);
            if (resultado.total > LIMITE_EXPORT_CSV) {
                res.setHeader('X-Export-Truncated', 'true');
            }
            res.status(200).send(csv);
        } catch (error) { next(error); }
    }
}

module.exports = new MovimientosController();
