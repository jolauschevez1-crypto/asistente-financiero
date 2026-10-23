// src/routes/configuracionRoutes.js
const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// Publica: el login y el shell global necesitan tema/marca antes de autenticar.
router.get('/', asyncHandler(configuracionController.obtenerConfiguracion));

// Administracion (protegidas)
router.get('/admin', verificarToken, verificarAdmin, asyncHandler(configuracionController.obtenerConfiguracionAdmin));
router.put('/', verificarToken, verificarAdmin, asyncHandler(configuracionController.actualizarConfiguracion));
router.get('/respaldo', verificarToken, verificarAdmin, asyncHandler(configuracionController.exportarRespaldo));
router.post('/respaldo/restaurar', verificarToken, verificarAdmin, asyncHandler(configuracionController.restaurarRespaldo));

module.exports = router;
