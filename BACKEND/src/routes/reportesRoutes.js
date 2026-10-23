// src/routes/reportesRoutes.js
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const adminController = require('../controllers/adminController');
const reportesAdminController = require('../controllers/reportesAdminController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// ==========================================
// ALIASES HISTÓRICOS (autenticados y limitados al propietario de la sesión)
// ==========================================
// Un telegram_id suministrado por el cliente nunca concede acceso a otra cuenta.
router.get('/telegram/hoy', verificarToken, asyncHandler(reportesController.hoyWeb));
router.get('/telegram/mes', verificarToken, asyncHandler(reportesController.mesWeb));
router.get('/telegram/balance', verificarToken, asyncHandler(reportesController.balanceWeb));
router.get('/telegram/categorias', verificarToken, asyncHandler(reportesController.categoriasWeb));

// ==========================================
// RUTAS PARA LA WEB / ANGULAR (Protegidas)
// ==========================================
// El middleware 'verificarToken' bloquea la petición si no hay un JWT válido.
// Si es válido, inyecta el 'usuario.id' y pasa al controlador '...Web'.
router.get('/web/hoy', verificarToken, asyncHandler(reportesController.hoyWeb));
router.get('/web/mes', verificarToken, asyncHandler(reportesController.mesWeb));
router.get('/web/balance', verificarToken, asyncHandler(reportesController.balanceWeb));
router.get('/web/categorias', verificarToken, asyncHandler(reportesController.categoriasWeb));
router.get('/web/metricas-globales', verificarToken, verificarAdmin, asyncHandler(adminController.verMetricas));
router.get('/web/dashboard-admin', verificarToken, verificarAdmin, asyncHandler(adminController.verDashboardAdmin));

// ==========================================
// MÓDULO DE REPORTES (Administración, protegidas)
// ==========================================
router.get('/admin/generar', verificarToken, verificarAdmin, asyncHandler(reportesAdminController.generar));
router.get('/admin/exportar', verificarToken, verificarAdmin, asyncHandler(reportesAdminController.exportar));

module.exports = router;
