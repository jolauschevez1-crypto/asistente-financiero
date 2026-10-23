// src/models/auditoriaModel.js
const db = require('../config/db');
const auditoriaQueries = require('../queries/auditoriaQueries');
const { crearConstructorCondiciones, construirResultadoPaginado } = require('../utils/queryBuilder');

class AuditoriaModel {
    /**
     * Inserta una entrada de auditoría.
     * @param {object} datos
     * @param {number|null} datos.usuarioId
     * @param {string} datos.accion
     * @param {string|null} [datos.entidad]
     * @param {number|null} [datos.entidadId]
     * @param {object|null} [datos.detalle]
     * @param {string|null} [datos.ip]
     */
    async registrar({ usuarioId, accion, entidad, entidadId, detalle, ip }) {
        return db.query(auditoriaQueries.INSERTAR, [
            usuarioId ?? null,
            accion,
            entidad ?? null,
            entidadId ?? null,
            detalle ? JSON.stringify(detalle) : null,
            ip ?? null,
        ]);
    }

    /**
     * Lista entradas de auditoría paginadas/filtrables/ordenables para administración.
     * @param {object} opts { page, limit, sortBy, sortDir, usuarioId, accion, entidad, fechaDesde, fechaHasta }
     */
    async listarPaginado({
        page = 1, limit = 20, sortBy = 'creado_en', sortDir = 'desc',
        usuarioId, accion, entidad, fechaDesde, fechaHasta,
    } = {}) {
        const { condiciones, valores, agregar, paginar } = crearConstructorCondiciones();

        if (usuarioId) agregar('a.usuario_id = ?', usuarioId);
        if (accion) agregar('a.accion = ?', accion);
        if (entidad) agregar('a.entidad = ?', entidad);
        if (fechaDesde) agregar('a.creado_en >= ?', fechaDesde);
        if (fechaHasta) agregar('a.creado_en < ?', fechaHasta);

        const ordenColumna = auditoriaQueries.COLUMNAS_ORDENABLES_AUDITORIA[sortBy] || 'a.creado_en';
        const ordenDireccion = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const { indexLimit, indexOffset } = paginar(page, limit);

        const query = auditoriaQueries.GENERAR_LISTADO_PAGINADO_AUDITORIA({
            condiciones, ordenColumna, ordenDireccion, indexLimit, indexOffset,
        });

        const resultado = await db.query(query, valores);
        return construirResultadoPaginado(resultado, page, limit);
    }
}

module.exports = new AuditoriaModel();
