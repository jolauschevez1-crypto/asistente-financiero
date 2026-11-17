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
 * Claves que la pantalla de inicio y el shell global pueden leer sin sesion.
 * Lista de permitidos (allowlist): cualquier clave nueva queda privada hasta que se agregue aqui.
 * Hallazgo ZAP H-01 (Exposed Secrets, CWE-522): antes se devolvia toda la configuracion y las
 * claves sensibles solo se enmascaraban, revelando su existencia y sus ultimos 4 caracteres.
 */
const CLAVES_PUBLICAS = ['nombre_sistema', 'logo_url', 'tema', 'color_principal', 'idioma', 'moneda'];

/**
 * Configuracion publica: solo las claves de CLAVES_PUBLICAS. Nunca incluye
 * `ia_api_key`, `telegram_bot_token` ni claves desconocidas.
 * @param {Record<string, string>} config
 * @returns {Record<string, string>}
 */
function mapConfiguracionPublica(config) {
    const publica = {};
    CLAVES_PUBLICAS.forEach((clave) => {
        if (Object.prototype.hasOwnProperty.call(config || {}, clave)) publica[clave] = config[clave];
    });
    return publica;
}

module.exports = { mapConfiguracionAdmin, mapConfiguracionPublica, enmascarar, CLAVES_PUBLICAS, CLAVES_SENSIBLES };
