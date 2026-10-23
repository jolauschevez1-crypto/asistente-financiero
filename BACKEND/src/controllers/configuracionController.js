// src/controllers/configuracionController.js
const configuracionModel = require('../models/configuracionModel');
const logger = require('../utils/logger');
const { mapConfiguracionAdmin, mapConfiguracionPublica } = require('../dtos/configuracionDto');
const { registrarAuditoria } = require('../utils/auditoria');



class ConfiguracionController {
    /**
     * Configuracion publica (sin token): la pantalla de login y el shell global
     * necesitan tema/marca antes de iniciar sesion. Las claves sensibles se enmascaran.
     * @route GET /api/configuracion
     */
    async obtenerConfiguracion(req, res, next) {
        try {
            const config = await configuracionModel.obtenerConfiguracion();
            return res.status(200).json({ success: true, data: mapConfiguracionPublica(config) });
        } catch (error) {
            logger.error('Error al obtener configuracion publica:', error);
            next(error);
        }
    }

    /**
     * Configuracion completa (admin): valores sin enmascarar, para editar campos sensibles.
     * @route GET /api/configuracion/admin
     */
    async obtenerConfiguracionAdmin(req, res, next) {
        try {
            const config = await configuracionModel.obtenerConfiguracion();
            return res.status(200).json({ success: true, data: mapConfiguracionAdmin(config) });
        } catch (error) {
            logger.error('Error al obtener configuracion admin:', error);
            next(error);
        }
    }

    /**
     * Actualiza uno o mas pares clave/valor de configuracion.
     * @route PUT /api/configuracion
     */
    async actualizarConfiguracion(req, res, next) {
        try {
            const cambios = req.body || {};
            if (typeof cambios !== 'object' || Array.isArray(cambios) || Object.keys(cambios).length === 0) {
                return res.status(400).json({ success: false, message: 'Debe enviar al menos un par clave/valor a actualizar.' });
            }

            const config = await configuracionModel.actualizarConfiguracion(cambios);
            logger.info(`Configuracion actualizada por admin ${req.usuario.id}: claves [${Object.keys(cambios).join(', ')}].`);
            await registrarAuditoria(req, { accion: 'CONFIG_ACTUALIZADA', entidad: 'configuracion', detalle: { claves: Object.keys(cambios) } });
            return res.status(200).json({ success: true, message: 'Configuracion actualizada correctamente.', data: mapConfiguracionAdmin(config) });
        } catch (error) {
            logger.error('Error al actualizar configuracion:', error);
            next(error);
        }
    }

    /**
     * Exporta un respaldo JSON con todas las tablas de la aplicación, incluidos los módulos financieros.
     * @route GET /api/configuracion/respaldo
     */
    async exportarRespaldo(req, res, next) {
        try {
            const datos = await configuracionModel.exportarDatos();
            const fecha = new Date().toISOString().slice(0, 10);
            logger.info(`Respaldo completo exportado por admin ${req.usuario.id}.`);
            await registrarAuditoria(req, { accion: 'RESPALDO_EXPORTADO', entidad: 'configuracion' });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="respaldo-${fecha}.json"`);
            return res.status(200).send(JSON.stringify(datos, null, 2));
        } catch (error) {
            logger.error('Error al exportar respaldo:', error);
            next(error);
        }
    }

    /**
     * Restaura todas las tablas de la aplicación, incluidos los módulos financieros desde un respaldo JSON, reemplazando su
     * contenido actual. Requiere el campo `confirmacion: 'RESTAURAR'` como segunda barrera
     * contra llamadas accidentales/automatizadas.
     * @route POST /api/configuracion/respaldo/restaurar
     */
    async restaurarRespaldo(req, res, next) {
        try {
            const { confirmacion, datos } = req.body || {};

            if (confirmacion !== 'RESTAURAR') {
                return res.status(400).json({
                    success: false,
                    message: 'Debe enviar el campo confirmacion con el valor exacto "RESTAURAR" para continuar.',
                });
            }

            if (!datos || typeof datos !== 'object') {
                return res.status(400).json({ success: false, message: 'El respaldo enviado no tiene un formato valido.' });
            }

            await configuracionModel.restaurarDatos(datos);
            logger.info(`Respaldo completo RESTAURADO por admin ${req.usuario.id} (todas las tablas reemplazadas).`);
            await registrarAuditoria(req, { accion: 'RESPALDO_RESTAURADO', entidad: 'configuracion' });
            return res.status(200).json({ success: true, message: 'Respaldo restaurado correctamente.' });
        } catch (error) {
            logger.error('Error al restaurar respaldo:', error);
            next(error);
        }
    }
}

module.exports = new ConfiguracionController();
