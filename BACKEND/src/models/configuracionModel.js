// src/models/configuracionModel.js
const db = require('../config/db');
const configuracionQueries = require('../queries/configuracionQueries');
const { crearCache } = require('../utils/memCache');

const CLAVE_CACHE = 'config';
const cacheConfiguracion = crearCache({ ttlMs: 5 * 60 * 1000 });

class ConfiguracionModel {
    /**
     * Devuelve toda la configuracion como un objeto plano { clave: valor }.
     */
    async obtenerConfiguracion() {
        return cacheConfiguracion.get(CLAVE_CACHE, async () => {
            const res = await db.query(configuracionQueries.SELECT_ALL);
            return res.rows.reduce((acumulado, fila) => {
                acumulado[fila.clave] = fila.valor;
                return acumulado;
            }, {});
        });
    }

    /**
     * Actualiza (upsert) uno o mas pares clave/valor dentro de una transaccion.
     * @param {Record<string, string>} cambios
     */
    async actualizarConfiguracion(cambios) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            for (const [clave, valor] of Object.entries(cambios)) {
                await client.query(configuracionQueries.UPSERT, [clave, valor === undefined || valor === null ? '' : String(valor)]);
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        cacheConfiguracion.invalidate(CLAVE_CACHE);
        return this.obtenerConfiguracion();
    }

    /**
     * Exporta el contenido completo de las tablas propias de la app como un respaldo JSON.
     */
    async exportarDatos() {
        return require('../services/backupService').exportData();
    }

    async restaurarDatos(payload) {
        const result = await require('../services/backupService').restoreData(payload);
        cacheConfiguracion.invalidate(CLAVE_CACHE);
        return result;
    }
}

module.exports = new ConfiguracionModel();
