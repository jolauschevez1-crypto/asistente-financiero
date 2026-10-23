/**
 * @file sanitizarMiddleware.js
 * @description Sanitizacion defensiva global de `req.body`/`req.query`/`req.params`: limpia
 * constructos HTML/script peligrosos (via la libreria `xss`) de forma recursiva. Deliberadamente
 * NO usa `express-validator`'s `.escape()` (codifica entidades HTML como `&` -> `&amp;`, lo que
 * causaria doble-escapado al mostrarse en Angular, que ya auto-escapa el texto interpolado).
 */
const xss = require('xss');

function sanitizarProfundo(valor) {
    if (typeof valor === 'string') {
        const limpio = xss(valor);
        return limpio.replace(/javascript\s*:/gi, '').replace(/vbscript\s*:/gi, '');
    }
    if (Array.isArray(valor)) return valor.map(sanitizarProfundo);
    if (valor && typeof valor === 'object') {
        for (const clave of Object.keys(valor)) {
            if(!['password','passwordActual','nuevaPassword','nuevaContrasena','resetToken','token','refreshToken','credential','imagen'].includes(clave)) valor[clave] = sanitizarProfundo(valor[clave]);
        }
        return valor;
    }
    return valor;
}

function sanitizarMiddleware(req, res, next) {
    // Restore validates the complete schema and checksum; changing strings here
    // would corrupt an otherwise valid backup. SQL values remain parametrized.
    if (req.method === 'POST' && req.path === '/api/configuracion/respaldo/restaurar') return next();
    if (req.body) req.body = sanitizarProfundo(req.body);
    if (req.query) req.query = sanitizarProfundo(req.query);
    if (req.params) req.params = sanitizarProfundo(req.params);
    next();
}

module.exports = sanitizarMiddleware;
