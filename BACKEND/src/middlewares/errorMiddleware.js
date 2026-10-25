// src/middlewares/errorMiddleware.js
const logger = require('../utils/logger');

// Middleware para manejo de errores globales
const errorMiddleware = (err, req, res, next) => {
  let status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599 ? err.status : 500;
  let message = status < 500 || err.expose ? err.message : 'No se pudo completar la operación. Inténtalo nuevamente.';
  const databaseErrors = {
    '23505': [409, 'Ya existe un registro con esos datos.'],
    '23503': [409, 'El registro tiene relaciones que impiden esta operación.'],
    '23514': [400, 'Los datos no cumplen las reglas de validación.'],
    '22001': [400, 'Uno de los textos supera la longitud permitida.'],
    '22P02': [400, 'Uno de los valores tiene un formato inválido.'],
    '22007': [400, 'La fecha indicada tiene un formato inválido.'],
  };
  if(databaseErrors[err.code]) [status,message]=databaseErrors[err.code];
  // P0001: reglas de integridad propias (triggers de moneda); su mensaje es público y no contiene datos.
  if(err.code==='P0001') { status=409; message=err.message; }
  if(err.type === 'entity.parse.failed') message='El cuerpo de la solicitud debe ser JSON válido.';
  if(err.type === 'entity.too.large') message='El archivo o solicitud supera el tamaño permitido.';
  // La respuesta pública y el registro no contienen SQL, parámetros ni trazas internas.
  logger.error(`${req.method} ${req.path} - ${status}`, { name: err.name, code: err.code || err.type || 'ERROR' });

  res.status(status).json({
    success: false,
    status,
    message: message || 'No se pudo completar la operación.'
  });
};

module.exports = errorMiddleware;
