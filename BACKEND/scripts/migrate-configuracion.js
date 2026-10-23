// scripts/migrate-configuracion.js
// Migracion aditiva e idempotente: crea la tabla configuracion (clave/valor) y la siembra
// con valores por defecto que coinciden exactamente con el comportamiento actual del sistema.
const db = require('../src/config/db');

// nombre_sistema/logo_url quedan vacios a proposito: el frontend ya tiene sus propios
// textos por defecto ("Asistente"/"Financiero"/"Control Financiero") hardcodeados y solo
// los reemplaza si el admin configura un valor explicito, evitando cualquier cambio
// visual el dia que se despliega este modulo.
const VALORES_POR_DEFECTO = {
    tema: 'oscuro',
    color_principal: 'cyan',
    nombre_sistema: '',
    logo_url: '',
    idioma: 'es',
    moneda: 'PEN',
    ia_modelo: process.env.GROQ_MODEL || '',
    ia_api_key: process.env.GROQ_API_KEY || '',
    telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
};

(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS configuracion (
                id SERIAL PRIMARY KEY,
                clave VARCHAR(100) UNIQUE NOT NULL,
                valor TEXT,
                actualizado_en TIMESTAMP DEFAULT NOW()
            );
        `);

        for (const [clave, valor] of Object.entries(VALORES_POR_DEFECTO)) {
            await db.query(
                'INSERT INTO configuracion (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO NOTHING;',
                [clave, valor]
            );
        }

        console.log('OK: tabla configuracion lista y sembrada.');
    } catch (error) {
        console.error('Fallo la migracion:', error);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
