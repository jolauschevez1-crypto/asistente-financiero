const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
process.env.DB_ENGINE = 'pglite';
process.env.PGLITE_DATA_DIR = 'memory://';
const db = require('../src/config/db');
const backup = require('../src/services/backupService');
test.before(async () => {
    await require('../scripts/init-local').initialize();
    await db.query("INSERT INTO usuarios(nombre,correo,password,rol) VALUES('Administrador prueba','backup@example.test','hash-ficticio','ADMIN')");
    await db.query("INSERT INTO cuentas(nombre,usuario_id,saldo_actual) VALUES('Prueba',1,50)");
    await db.query("INSERT INTO fin_deudas(usuario_id,nombre,contraparte,tipo,monto) VALUES(1,'Deuda de prueba','Cuenta ficticia','PAGAR',25)");
    await db.query("INSERT INTO fin_grupos(nombre,propietario_id) VALUES('Grupo de prueba',1)");
    await db.query("INSERT INTO fin_miembros(grupo_id,usuario_id) VALUES(1,1)");
    await db.query("INSERT INTO auditoria(usuario_id,accion,detalle) VALUES(1,'PRUEBA','{\"dato\":true}'::jsonb)");
});
test.after(() => db.pool.end());
test('respaldo completo conserva módulos nuevos y secuencias después de restaurar', async () => {
    const original = await backup.exportData();
    assert.ok(original.tablas.fin_deudas);
    assert.ok(original.tablas.fin_miembros);
    assert.ok(original.tablas.auditoria);
    const downloaded = JSON.parse(JSON.stringify(original));
    await db.query('UPDATE cuentas SET saldo_actual=5 WHERE id=1');
    await backup.restoreData(downloaded);
    assert.equal(Number((await db.query('SELECT saldo_actual FROM cuentas WHERE id=1')).rows[0].saldo_actual),50);
    assert.equal((await db.query('SELECT nombre FROM fin_deudas')).rows[0].nombre,'Deuda de prueba');
    assert.equal((await db.query('SELECT detalle FROM auditoria')).rows[0].detalle.dato,true);
    const added = await db.query("INSERT INTO fin_grupos(nombre,propietario_id) VALUES('Segundo',1) RETURNING id");
    assert.equal(added.rows[0].id,2);
});
test('rechaza respaldo antiguo o alterado sin eliminar datos', async () => {
    await assert.rejects(backup.restoreData({usuarios:[]}), /versión 2/);
    const payload = await backup.exportData();
    payload.tablas.cuentas[0].saldo_actual='999';
    await assert.rejects(backup.restoreData(payload), /SHA-256/);
    assert.equal(Number((await db.query('SELECT saldo_actual FROM cuentas WHERE id=1')).rows[0].saldo_actual),50);
});
test('un error de integridad durante restauración revierte toda la operación', async () => {
    const payload = await backup.exportData();
    payload.tablas.fin_deudas[0].usuario_id=99999;
    payload.sha256=backup.checksum(payload.tablas);
    await assert.rejects(backup.restoreData(payload));
    assert.equal((await db.query('SELECT usuario_id FROM fin_deudas WHERE id=1')).rows[0].usuario_id,1);
    assert.equal((await db.query('SELECT count(*) AS n FROM fin_grupos')).rows[0].n,2);
});
