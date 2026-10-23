// src/middlewares/validadorMiddleware.js
const { validationResult } = require('express-validator');

// ==========================================
// GUARDIA DE FORMULARIOS (validarCampos)
// ==========================================

/**
 * Corre las validation chains de express-validator ya registradas en la ruta y, si alguna
 * falla, responde 400 sin llegar al controlador. La forma de la respuesta sigue la misma
 * convencion que el resto de la API (`success`, `message`) para que el frontend siga leyendo
 * `err?.error?.message` de forma generica; `errores` agrega el detalle campo por campo.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validarCampos = (req, res, next) => {
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
        const listaErrores = errores.array().map((err) => ({ campo: err.path, error: err.msg }));
        return res.status(400).json({
            success: false,
            message: listaErrores[0].error,
            errores: listaErrores,
        });
    }
    next();
};

module.exports = {
    validarCampos,
};