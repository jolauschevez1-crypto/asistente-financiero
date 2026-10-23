/**
 * @file iaValidators.js
 * @description Validation chains de express-validator para el modulo de IA.
 */
const { body } = require('express-validator');

const validarTexto = body('texto')
    .notEmpty().withMessage('El campo "texto" es requerido.')
    .isLength({ max: 2000 }).withMessage('El texto no puede superar los 2000 caracteres.');

const validarPregunta = body('pregunta')
    .notEmpty().withMessage('El campo "pregunta" es requerido.')
    .isLength({ max: 2000 }).withMessage('La pregunta no puede superar los 2000 caracteres.');

module.exports = {
    validarProcesarMensaje: [validarTexto],
    validarPreguntar: [validarPregunta],
};
