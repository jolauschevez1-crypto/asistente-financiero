/**
 * @file auditoriaQueries.js
 * @description Diccionario centralizado de consultas SQL para el módulo de auditoría.
 */

module.exports = {
    /**
     * Inserta una entrada de auditoría.
     */
    INSERTAR: `
        INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip)
        VALUES ($1, $2, $3, $4, $5, $6);
    `,

    /**
     * Whitelist de columnas ordenables para el listado paginado de auditoría
     * (evita inyección SQL vía el parámetro sortBy).
     */
    COLUMNAS_ORDENABLES_AUDITORIA: {
        id: 'a.id',
        creado_en: 'a.creado_en',
        accion: 'a.accion',
        usuario_id: 'a.usuario_id',
    },

    /**
     * Genera el listado paginado/filtrable/ordenable de entradas de auditoría para
     * administración.
     * @param {object} opts
     * @param {string[]} opts.condiciones Fragmentos SQL ya armados para el WHERE.
     * @param {string} opts.ordenColumna Columna SQL ya resuelta desde COLUMNAS_ORDENABLES_AUDITORIA.
     * @param {string} opts.ordenDireccion 'ASC' | 'DESC'.
     * @param {number} opts.indexLimit Índice del parámetro LIMIT.
     * @param {number} opts.indexOffset Índice del parámetro OFFSET.
     */
    GENERAR_LISTADO_PAGINADO_AUDITORIA: ({ condiciones, ordenColumna, ordenDireccion, indexLimit, indexOffset }) => `
        SELECT
            a.id, a.usuario_id, a.accion, a.entidad, a.entidad_id, a.detalle, a.ip, a.creado_en,
            u.nombre AS usuario_nombre, u.correo AS usuario_correo,
            COUNT(*) OVER() AS total_registros
        FROM auditoria a
        LEFT JOIN usuarios u ON u.id = a.usuario_id
        ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
        ORDER BY ${ordenColumna} ${ordenDireccion}, a.id DESC
        LIMIT $${indexLimit} OFFSET $${indexOffset};
    `
};
