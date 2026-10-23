// scripts/migrate-indices-rendimiento.js
// Migración aditiva e idempotente: agrega índices de rendimiento en las tablas de mayor
// tráfico (movimientos, usuarios, auditoria, cuentas), sin tocar el esquema existente.
const db = require('../src/config/db');

(async () => {
    try {
        await db.query('CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_id ON movimientos(usuario_id);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_movimientos_categoria_id ON movimientos(categoria_id);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta_origen_id ON movimientos(cuenta_origen_id);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta_destino_id ON movimientos(cuenta_destino_id);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_fecha_activo ON movimientos(usuario_id, fecha DESC) WHERE deleted_at IS NULL;');
        await db.query('CREATE INDEX IF NOT EXISTS idx_movimientos_deleted_at ON movimientos(deleted_at);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_login ON usuarios(ultimo_login DESC);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad);');
        await db.query('CREATE INDEX IF NOT EXISTS idx_cuentas_usuario_id ON cuentas(usuario_id);');
        console.log('OK: indices de rendimiento listos.');
    } catch (error) {
        console.error('Fallo la migracion:', error);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
})();
