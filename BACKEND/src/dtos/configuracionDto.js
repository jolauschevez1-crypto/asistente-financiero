/**
 * @file configuracionDto.js
 * @description Formas de salida (DTO) del recurso Configuracion. Reubica la logica de
 * enmascarado de claves sensibles que antes vivia inline en configuracionController.js,
 * sin cambiar su comportamiento (mismas claves enmascaradas, mismo formato de mascara).
 */

const CLAVES_SENSIBLES = ['ia_api_key', 'telegram_bot_token'];

/**
 * Enmascara un valor sensible dejando visibles solo los ultimos 4 caracteres.
 * @param {string} valor
 * @returns {string} '****' si el valor tiene 4 caracteres o menos, o `****` + los ultimos 4.
 */
function enmascarar(valor) {
    if (!valor) return '';
    const texto = String(valor);
    if (texto.length <= 4) return '****';
    return `****${texto.slice(-4)}`;
}

/**
 * Configuracion completa, sin enmascarar (uso admin).
 * @param {Record<string, string>} config
 * @returns {Record<string, string>}
 */
function mapConfiguracionAdmin(config) {
    return config;
}

/**
 * Configuracion publica: igual que la admin, pero con las claves sensibles
 * (`ia_api_key`, `telegram_bot_token`) enmascaradas.
 * @param {Record<string, string>} config
 * @returns {Record<string, string>}
 */
function mapConfiguracionPublica(config) {
    const copia = { ...config };
    CLAVES_SENSIBLES.forEach((clave) => {
        if (copia[clave]) copia[clave] = enmascarar(copia[clave]);
    });
    return copia;
}

module.exports = { mapConfiguracionAdmin, mapConfiguracionPublica, enmascarar };
