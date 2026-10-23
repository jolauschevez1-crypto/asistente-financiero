/**
 * @file memCache.js
 * @description Utilidad compartida de cache en memoria con TTL, sin dependencias externas
 * (Map + Date.now()), en el mismo espiritu de fabrica pequeña que queryBuilder.js.
 */

/**
 * @param {object} [opts]
 * @param {number} [opts.ttlMs=60000] Tiempo de vida de cada entrada en milisegundos.
 * @returns {{
 *   get: (key: string, fetcher: () => Promise<unknown>) => Promise<unknown>,
 *   invalidate: (key?: string) => void,
 * }}
 */
function crearCache({ ttlMs = 60000 } = {}) {
    const almacen = new Map();

    /**
     * Devuelve el valor cacheado si sigue vigente; si no, lo obtiene con `fetcher`,
     * lo guarda con su fecha de expiracion y lo retorna.
     */
    async function get(key, fetcher) {
        const entrada = almacen.get(key);
        if (entrada && entrada.expiraEn > Date.now()) return entrada.valor;

        const valor = await fetcher();
        almacen.set(key, { valor, expiraEn: Date.now() + ttlMs });
        return valor;
    }

    /** Invalida una entrada puntual, o todo el cache si no se pasa `key`. */
    function invalidate(key) {
        if (key === undefined) almacen.clear();
        else almacen.delete(key);
    }

    return { get, invalidate };
}

module.exports = { crearCache };
