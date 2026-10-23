/**
 * @file movimientoDto.js
 * @description Forma de salida (DTO) del recurso Movimiento. Igual que usuarioDto: identidad
 * sobre la fila cruda hoy, pero como funcion nombrada/documentada en vez de shaping inline.
 */

/**
 * @param {object} fila Fila cruda de `movimientos` (o su vista global con joins) devuelta por `pg`.
 * @returns {object} Representacion de Movimiento expuesta por la API.
 */
function mapMovimiento(fila) {
    return fila;
}

/**
 * @param {object[]} filas
 * @returns {object[]}
 */
function mapMovimientos(filas) {
    return filas.map(mapMovimiento);
}

module.exports = { mapMovimiento, mapMovimientos };
