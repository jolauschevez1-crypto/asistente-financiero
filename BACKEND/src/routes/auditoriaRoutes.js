// src/routes/auditoriaRoutes.js
const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/auditoria - Listado paginado/filtrable de auditoria (solo admin)
router.get('/', verificarToken, verificarAdmin, asyncHandler(auditoriaController.listar));

module.exports = router;
