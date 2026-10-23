const express = require('express');
const router = express.Router();
const iaController = require('../controllers/iaController');
const asyncHandler = require('../utils/asyncHandler');
const { verificarToken } = require('../middlewares/authMiddleware');
const { validarCampos } = require('../middlewares/validadorMiddleware');
const { validarProcesarMensaje, validarPreguntar } = require('../validators/iaValidators');

// POST /api/ia/procesar - Enviar texto para análisis e intenciones (bot de Telegram, sin auth)
router.get('/estado', verificarToken, (req, res) => res.json({success: true, data: require('../services/groqService').status()}));
router.post('/procesar', verificarToken, validarProcesarMensaje, validarCampos, asyncHandler(iaController.procesarMensaje));

// Módulo IA self-service (panel web): ambos roles, cada uno analiza solo sus propios datos.
router.post('/preguntar', verificarToken, validarPreguntar, validarCampos, asyncHandler(iaController.preguntar));
router.get('/analizar-gastos', verificarToken, asyncHandler(iaController.analizarGastosWeb));
router.get('/analizar-ingresos', verificarToken, asyncHandler(iaController.analizarIngresosWeb));
router.get('/gastos-innecesarios', verificarToken, asyncHandler(iaController.gastosInnecesariosWeb));
router.get('/reporte', verificarToken, asyncHandler(iaController.reporteNarrativoWeb));
router.get('/prediccion', verificarToken, asyncHandler(iaController.prediccionWeb));
router.get('/consejos', verificarToken, asyncHandler(iaController.consejosWeb));

module.exports = router;
