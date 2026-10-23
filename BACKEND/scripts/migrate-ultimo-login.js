// scripts/migrate-ultimo-login.js
// Migración aditiva e idempotente: agrega la columna ultimo_login a usuarios.
const db = require('../src/config/db');

(async () => {
    try {
        await db.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP NULL;');
        console.log('OK: usuarios.ultimo_login lista.');
    } catch (error) {
        console.error('Fallo la migracion:', error);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
