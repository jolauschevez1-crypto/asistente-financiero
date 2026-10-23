/**
 * @file asyncHandler.js
 * @description Envuelve un handler async de Express para reenviar cualquier excepción
 * (rechazo de promesa) a next(error), evitando repetir try/catch en cada controlador.
 */

/**
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} fn
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
