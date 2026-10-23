// src/controllers/adminController.js
const adminModel = require('../models/adminModel');
const logger = require('../utils/logger');
const db = require('../config/db');

class AdminController {
    /**
     * Obtiene métricas globales de la aplicación (Solo para Administradores).
     * @route GET /api/reportes/web/metricas-globales
     */
    async verMetricas(req, res, next) {
        try {
            logger.info(`El administrador con ID ${req.usuario.id} está consultando las métricas globales.`);
            
            // Llamamos al modelo para que haga el conteo en la base de datos
            const metricas = await adminModel.obtenerEstadisticasGenerales(require('../finance/currency').validate(req.query.moneda));

            return res.status(200).json({
                success: true,
                mensaje: 'Métricas obtenidas correctamente',
                data: metricas
            });

        } catch (error) {
            logger.error('Error al obtener métricas de administrador:', error);
            next(error);
        }
    }

    /**
     * Obtiene el payload completo del Dashboard Administrativo: KPIs globales,
     * actividad reciente, series para gráficos y estado de servidor/base de datos.
     * @route GET /api/reportes/web/dashboard-admin
     */
    async verDashboardAdmin(req, res, next) {
        try {
            logger.info(`El administrador con ID ${req.usuario.id} está consultando el dashboard global.`);

            const [metricas, pingRes] = await Promise.all([
                adminModel.obtenerMetricasDashboard(require('../finance/currency').validate(req.query.moneda)),
                db.query('SELECT 1 AS ok'),
            ]);

            return res.status(200).json({
                success: true,
                mensaje: 'Dashboard obtenido correctamente',
                data: {
                    ...metricas,
                    servidor: {
                        estado: 'UP',
                        uptimeSegundos: process.uptime(),
                        timestamp: new Date().toISOString(),
                    },
                    baseDatos: {
                        estado: pingRes.rows[0].ok === 1 ? 'UP' : 'DOWN',
                    },
                },
            });
        } catch (error) {
            logger.error('Error al obtener el dashboard de administrador:', error);
            next(error);
        }
    }
}

module.exports = new AdminController();
