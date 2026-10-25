/**
 * @file index.js
 * @description Director de orquesta para consolidar y exportar todas las rutas de la API bajo el prefijo principal.
 */

const express = require('express');
const router = express.Router();

// Importación de sub-rutas
const auditoriaRoutes = require('./auditoriaRoutes');
const authRoutes = require('./authRoutes');
const configuracionRoutes = require('./configuracionRoutes');
const iaRoutes = require('./iaRoutes');
const movimientosRoutes = require('./movimientosRoutes');
const movimientosAdminRoutes = require('./movimientosAdminRoutes');
const reportesRoutes = require('./reportesRoutes');
const usuariosRoutes = require('./usuariosRoutes');

// Asignación de sub-rutas con sus respectivos prefijos
router.use('/auditoria', auditoriaRoutes);
router.use('/auth', authRoutes);
router.use('/configuracion', configuracionRoutes);
router.use('/ia', iaRoutes);
router.use('/movimientos/admin', movimientosAdminRoutes); // prefijo más específico antes de '/movimientos'
router.use('/movimientos', movimientosRoutes);
router.use('/reportes', reportesRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/finanzas', require('./financeRoutes'));
router.use('/tasas', require('./tasasRoutes'));

/**
 * @route GET /api/health
 * @description Ruta de estado general de la API para monitoreo e integración.
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        service: 'asistente-financiero',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        status: 'UP'
    });
});

module.exports = router;
