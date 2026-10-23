// scripts/migrate-google-auth.js
// Migración aditiva e idempotente: agrega la columna google_id a la tabla usuarios
const db = require('../src/config/db');

(async () => {
    try {
        await db.query(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
        `);
        console.log('OK: columna google_id verificada/agregada correctamente en PostgreSQL.');
    } catch (error) {
        console.error('Error en migración de google_id:', error);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
