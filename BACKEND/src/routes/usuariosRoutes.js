const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verificarToken, verificarAdmin } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { validarCampos } = require('../middlewares/validadorMiddleware');
const {
    validarIdUsuario,
    validarIdUsuarioYMovimiento,
    validarMontoMovimientoUsuario,
    validarPasswordUsuario,
} = require('../validators/usuariosValidators');

// Rutas de autogestión de perfil (accesible por cualquier usuario autenticado)
router.get('/me/perfil', verificarToken, asyncHandler(usuariosController.obtenerMiPerfil));
router.put('/me/perfil', verificarToken, asyncHandler(usuariosController.actualizarMiPerfil));
router.put('/me/password', verificarToken, asyncHandler(usuariosController.cambiarMiPassword));
router.post('/me/vincular-google', verificarToken, asyncHandler(usuariosController.vincularGoogleMiPerfil));
router.delete('/me/vincular-google', verificarToken, asyncHandler(usuariosController.desvincularGoogleMiPerfil));
router.post('/me/avatar', verificarToken, asyncHandler(usuariosController.subirAvatarCloudinary));
router.delete('/me/avatar', verificarToken, asyncHandler(usuariosController.eliminarAvatar));

router.get('/', verificarToken, verificarAdmin, asyncHandler(usuariosController.listarUsuarios));
router.get('/buscar', verificarToken, verificarAdmin, asyncHandler(usuariosController.buscarUsuariosPorCorreo));
router.get('/:id/cuentas', verificarToken, verificarAdmin, validarIdUsuario, validarCampos, asyncHandler(usuariosController.listarCuentasUsuario));
router.get('/:id/movimientos', verificarToken, verificarAdmin, validarIdUsuario, validarCampos, asyncHandler(usuariosController.listarMovimientosUsuario));
router.put('/:id/movimientos/:movimientoId', verificarToken, verificarAdmin, validarMontoMovimientoUsuario, validarCampos, asyncHandler(usuariosController.actualizarMovimientoUsuario));
router.delete('/:id/movimientos/:movimientoId', verificarToken, verificarAdmin, validarIdUsuarioYMovimiento, validarCampos, asyncHandler(usuariosController.eliminarMovimientoUsuario));
router.get('/:id/estadisticas', verificarToken, verificarAdmin, validarIdUsuario, validarCampos, asyncHandler(usuariosController.obtenerEstadisticasUsuario));
router.get('/:id', verificarToken, verificarAdmin, validarIdUsuario, validarCampos, asyncHandler(usuariosController.obtenerUsuarioPorId));
router.put('/:id/reactivar', verificarToken, verificarAdmin, validarIdUsuario, validarCampos, asyncHandler(usuariosController.reactivarUsuario));
router.put('/:id/password', verificarToken, verificarAdmin, validarPasswordUsuario, validarCampos, asyncHandler(usuariosController.restablecerPassword));
router.put('/:id', verificarToken, verificarAdmin, validarIdUsuario, validarCampos, asyncHandler(usuariosController.actualizarUsuario));
router.delete('/:id', verificarToken, verificarAdmin, validarIdUsuario, validarCampos, asyncHandler(usuariosController.deshabilitarUsuario));

module.exports = router;
