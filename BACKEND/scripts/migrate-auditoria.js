// scripts/migrate-auditoria.js
// Migración aditiva e idempotente: crea la tabla auditoria (registro persistente y
// consultable de acciones admin-sensibles/destructivas), distinta del log de stdout.
const db = require('../src/config/db');

(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS auditoria (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NULL REFERENCES usuarios(id),
                accion VARCHAR(50) NOT NULL,
                entidad VARCHAR(50) NULL,
                entidad_id INTEGER NULL,
                detalle JSONB NULL,
                ip VARCHAR(45) NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await db.query('CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria(usuario_id);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_auditoria_creado_en ON auditoria(creado_en DESC);');
        console.log('OK: tabla auditoria lista.');
    } catch (error) {
        console.error('Fallo la migracion:', error);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
