/**
 * @file auditoria.js
 * @description Helper "fire-and-forget" para registrar entradas de auditoría desde los
 * controladores. Nunca lanza: un fallo al insertar la auditoría no debe abortar ni revertir
 * la operación de negocio real que esta registrando (ej. un respaldo restaurado con exito
 * no debe fallar solo porque el INSERT de auditoria tuvo un error transitorio).
 */
const auditoriaModel = require('../models/auditoriaModel');
const logger = require('./logger');

/**
 * @param {import('express').Request} req Request en curso (se usa para usuario_id e ip).
 * @param {object} datos
 * @param {string} datos.accion
 * @param {string} [datos.entidad]
 * @param {number} [datos.entidadId]
 * @param {object} [datos.detalle]
 */
async function registrarAuditoria(req, { accion, entidad, entidadId, detalle }) {
    try {
        await auditoriaModel.registrar({
            usuarioId: req.usuario?.id ?? null,
            accion,
            entidad: entidad ?? null,
            entidadId: entidadId ?? null,
            detalle: detalle ?? null,
            ip: req.ip,
        });
    } catch (error) {
        logger.error('Error al registrar auditoria (no bloqueante):', error);
    }
}

module.exports = { registrarAuditoria };
