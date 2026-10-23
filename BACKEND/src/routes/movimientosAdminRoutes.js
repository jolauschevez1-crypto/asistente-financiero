// src/routes/movimientosAdminRoutes.js
// Rutas de ADMINISTRACIÓN GLOBAL de movimientos (todos los usuarios).
// A diferencia de movimientosRoutes.js (self-service, siempre req.usuario.id),
// estas rutas son explícitamente globales y exigen verificarAdmin.
const express = require('express');
const router = express.Router();
const movimientosController = require('../controllers/movimientosController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { validarCampos } = require('../middlewares/validadorMiddleware');
const { validarIdMovimiento } = require('../validators/movimientosValidators');

// GET /api/movimientos/admin/todos - Listado global paginado/filtrable/ordenable
router.get('/todos', verificarToken, verificarAdmin, asyncHandler(movimientosController.listarGlobalAdmin));

// GET /api/movimientos/admin/categorias - Lista alfabética de categorías (filtro)
router.get('/categorias', verificarToken, verificarAdmin, asyncHandler(movimientosController.listarCategoriasGlobalAdmin));

// GET /api/movimientos/admin/exportar - Exportación CSV (mismos filtros que /todos)
router.get('/exportar', verificarToken, verificarAdmin, asyncHandler(movimientosController.exportarCsvAdmin));

// POST /api/movimientos/admin/:id/duplicar - Duplica un movimiento existente
router.post('/:id/duplicar', verificarToken, verificarAdmin, validarIdMovimiento, validarCampos, asyncHandler(movimientosController.duplicarAdmin));

module.exports = router;
