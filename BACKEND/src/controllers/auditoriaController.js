// src/controllers/auditoriaController.js
const auditoriaModel = require('../models/auditoriaModel');
const logger = require('../utils/logger');

class AuditoriaController {
    /**
     * Lista entradas de auditoría paginadas/filtrables (usuario/accion/fecha), solo admin.
     * @route GET /api/auditoria
     */
    async listar(req, res, next) {
        try {
            const {
                page = 1, limit = 20, sortBy = 'creado_en', sortDir = 'desc',
                usuarioId, accion, entidad, fechaDesde, fechaHasta,
            } = req.query;

            const resultado = await auditoriaModel.listarPaginado({
                page: parseInt(page) || 1,
                limit: Math.min(parseInt(limit) || 20, 100),
                sortBy, sortDir,
                usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
                accion, entidad, fechaDesde, fechaHasta,
            });

            res.status(200).json({
                success: true,
                data: resultado.data,
                meta: { total: resultado.total, page: resultado.page, limit: resultado.limit },
            });
        } catch (error) {
            logger.error('Error al listar auditoria:', error);
            next(error);
        }
    }
}

module.exports = new AuditoriaController();
