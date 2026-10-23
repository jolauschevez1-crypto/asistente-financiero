const express = require('express');
const router = express.Router();
const movimientosController = require('../controllers/movimientosController');
const { verificarToken } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { validarCampos } = require('../middlewares/validadorMiddleware');
const {
    validarIdMovimiento,
    validarEdicionMovimiento,
    validarCreacionMovimiento,
    validarCreacionCuenta
} = require('../validators/movimientosValidators');

// POST /api/movimientos - Registrar un nuevo movimiento
router.post('/', verificarToken, validarCreacionMovimiento, validarCampos, asyncHandler(movimientosController.registrar));

// POST /api/movimientos/cuentas - Crear una cuenta nueva para el usuario autenticado
router.post('/cuentas', verificarToken, validarCreacionCuenta, validarCampos, asyncHandler(movimientosController.crearCuenta));

// GET /api/movimientos/cuentas - Listar las cuentas de un usuario con saldos
router.get('/cuentas', verificarToken, asyncHandler(movimientosController.obtenerCuentas));

// PUT /api/movimientos/:id - Editar un movimiento existente (Angular)
router.put('/:id', verificarToken, validarEdicionMovimiento, validarCampos, asyncHandler(movimientosController.editarWeb));

// DELETE /api/movimientos/:id - Eliminar un movimiento (Soft Delete)
router.delete('/:id', verificarToken, validarIdMovimiento, validarCampos, asyncHandler(movimientosController.eliminarWeb));

// GET /api/movimientos - Listar el historial de movimientos
router.get('/', verificarToken, asyncHandler(movimientosController.obtenerHistorialWeb));

module.exports = router;
