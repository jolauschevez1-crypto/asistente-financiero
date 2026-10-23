// scripts/migrate-foto-url.js
// Migración aditiva e idempotente: agrega la columna foto_url a la tabla usuarios
const db = require('../src/config/db');

(async () => {
    try {
        await db.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);
        `);
        console.log('OK: columna foto_url verificada/agregada correctamente en PostgreSQL.');
    } catch (error) {
        console.error('Error en migración de foto_url:', error);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
