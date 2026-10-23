/**
 * @file iaDto.js
 * @description Forma de salida (DTO) de las respuestas del modulo IA. `iaService` ya devuelve
 * { respuesta, meta } listo para el cliente; este mapper solo formaliza el contrato de salida
 * como una funcion nombrada y documentada, por consistencia con el resto de modulos.
 */

/**
 * @param {string} respuesta Texto generado por la IA.
 * @param {object} meta Metadatos deterministas del contexto usado (no generados por la IA).
 * @param {number} meta.movimientos_analizados
 * @param {string|null} meta.periodo_desde
 * @param {string|null} meta.periodo_hasta
 * @returns {{ respuesta: string, meta: object }}
 */
function mapRespuestaIA(respuesta, meta) {
    return { respuesta, meta };
}

module.exports = { mapRespuestaIA };
