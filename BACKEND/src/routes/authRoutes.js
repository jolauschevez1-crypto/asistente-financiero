const express = require('express');
const router = express.Router();
// Nota: Asegúrate de que el nombre del archivo coincida con cómo lo guardaste en la carpeta controllers
const authController = require('../controllers/authControllers');
const asyncHandler = require('../utils/asyncHandler');
const { limiterAuth } = require('../middlewares/rateLimitMiddleware');
const { validarCampos } = require('../middlewares/validadorMiddleware');
const {
    validarLogin,
    validarRegistro,
    validarRecuperarPassword,
    validarVerificarCodigo,
    validarCambiarPassword,
} = require('../validators/authValidators');

// ==========================================
// RUTAS PÚBLICAS (Login y Registro)
// ==========================================
router.post('/login', limiterAuth, validarLogin, validarCampos, asyncHandler(authController.login));
router.get('/google/config', (req,res)=>res.json({enabled:process.env.GOOGLE_ENABLED==='true'&&Boolean(process.env.GOOGLE_CLIENT_ID),clientId:process.env.GOOGLE_ENABLED==='true'?process.env.GOOGLE_CLIENT_ID||null:null}));
router.post('/google', limiterAuth, asyncHandler(authController.loginConGoogle));
router.post('/register', limiterAuth, validarRegistro, validarCampos, asyncHandler(authController.registroPublico)); // Mantenida por compatibilidad
router.post('/registro', limiterAuth, validarRegistro, validarCampos, asyncHandler(authController.registroPublico));

// ==========================================
// RUTAS DE RECUPERACIÓN DE CONTRASEÑA
// ==========================================
router.post('/recuperar-password', limiterAuth, validarRecuperarPassword, validarCampos, asyncHandler(authController.solicitarRecuperacion));
router.post('/verificar-codigo', limiterAuth, validarVerificarCodigo, validarCampos, asyncHandler(authController.verificarCodigo));
router.post('/cambiar-password', limiterAuth, validarCambiarPassword, validarCampos, asyncHandler(authController.cambiarContrasena));

// ==========================================
// REFRESH TOKEN (sin limiterAuth: se llama legitimamente cada ~30 min por sesion activa)
// ==========================================
router.post('/refresh', asyncHandler(authController.refresh));

module.exports = router;
