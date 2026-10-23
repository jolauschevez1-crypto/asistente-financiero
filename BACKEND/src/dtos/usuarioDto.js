/**
 * @file usuarioDto.js
 * @description Forma de salida (DTO) del recurso Usuario para las respuestas HTTP del modulo
 * admin de usuarios. Hoy es una funcion identidad sobre la fila devuelta por la base de datos
 * (no se agrega ni se quita ningun campo) - formaliza el contrato de salida como una funcion
 * nombrada y documentada en vez de pasar filas crudas de `pg` directo a res.json().
 */

/**
 * @param {object} fila Fila cruda de la tabla `usuarios` (o su vista admin) devuelta por `pg`.
 * @returns {object} Representacion de Usuario expuesta por la API.
 */
function mapUsuario(fila) {
    if(!fila) return fila;
    return {...fila,moneda:fila.moneda || 'USD'};
}

/**
 * @param {object[]} filas
 * @returns {object[]}
 */
function mapUsuarios(filas) {
    return filas.map(mapUsuario);
}

module.exports = { mapUsuario, mapUsuarios };
