const { createHash } = require('node:crypto');
const db = require('../config/db');
const quote = value => '"' + value.replace(/"/g, '""') + '"';
const qualified = table => `public.${quote(table)}`;
const invalid = message => Object.assign(new Error(message), { status: 400 });
function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
}
function checksum(data) { return createHash('sha256').update(JSON.stringify(canonical(data))).digest('hex'); }
async function schema(client) {
    const { rows } = await client.query(`SELECT c.table_name,c.column_name,c.data_type FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name WHERE c.table_schema='public' AND t.table_type='BASE TABLE' ORDER BY c.table_name,c.ordinal_position`);
    const result = {};
    for (const row of rows) (result[row.table_name] ||= []).push({ nombre: row.column_name, tipo: row.data_type });
    return result;
}
async function orderedTables(client, tables) {
    const { rows } = await client.query(`SELECT child.relname AS child,parent.relname AS parent FROM pg_constraint f JOIN pg_class child ON child.oid=f.conrelid JOIN pg_namespace ns ON ns.oid=child.relnamespace JOIN pg_class parent ON parent.oid=f.confrelid WHERE f.contype='f' AND ns.nspname='public'`);
    const pending = new Set(tables), ordered = [];
    while (pending.size) {
        const ready = [...pending].filter(table => !rows.some(row => row.child === table && row.parent !== table && pending.has(row.parent)));
        if (!ready.length) throw invalid('El esquema contiene dependencias circulares; el respaldo no puede restaurarse con esta versión.');
        for (const table of ready) { pending.delete(table); ordered.push(table); }
    }
    return ordered;
}
async function exportData() {
    return db.withTransaction(async client => {
        const structure = await schema(client), tables = Object.keys(structure);
        // One consistent snapshot. Lock all application tables before reading any row.
        await client.query(`LOCK TABLE ${tables.map(qualified).join(',')} IN SHARE MODE`);
        const data = {};
        for (const table of tables) data[table] = (await client.query(`SELECT * FROM ${qualified(table)}`)).rows;
        // Normalize Date objects exactly as they appear in the downloaded JSON.
        const normalized = JSON.parse(JSON.stringify(data));
        return { formato: 'asistente-financiero-local', version: 2, exportado_en: new Date().toISOString(), esquema: structure, tablas: normalized, sha256: checksum(normalized) };
    });
}
async function restoreData(payload) {
    if (!payload || payload.formato !== 'asistente-financiero-local' || payload.version !== 2 || !payload.tablas || !payload.esquema) throw invalid('Seleccione un respaldo completo versión 2 generado por esta aplicación. Los respaldos antiguos omiten módulos financieros.');
    if (payload.sha256 !== checksum(payload.tablas)) throw invalid('El respaldo fue modificado o está incompleto: la comprobación SHA-256 no coincide.');
    return db.withTransaction(async client => {
        const structure = await schema(client), tables = Object.keys(structure);
        if (JSON.stringify(canonical(payload.esquema)) !== JSON.stringify(canonical(structure)) || JSON.stringify(Object.keys(payload.tablas).sort()) !== JSON.stringify(tables.sort())) throw invalid('El esquema del respaldo no coincide con esta versión. No se ha reemplazado ningún dato.');
        for (const table of tables) {
            if (!Array.isArray(payload.tablas[table])) throw invalid(`Tabla inválida: ${table}.`);
            const columns = structure[table].map(column => column.nombre).sort();
            for (const row of payload.tablas[table]) {
                if (!row || Array.isArray(row) || typeof row !== 'object' || JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(columns)) throw invalid(`Fila incompleta o columna desconocida en ${table}.`);
            }
        }
        if (!payload.tablas.usuarios?.some(row => ['ADMIN','ADMINISTRADOR'].includes(row.rol) && !row.deleted_at && row.password)) throw invalid('El respaldo debe conservar al menos una cuenta administradora activa con contraseña.');
        const ordered = await orderedTables(client, tables);
        // No CASCADE: any unexpected foreign table makes the operation fail safely.
        await client.query(`TRUNCATE ${tables.map(qualified).join(',')} RESTART IDENTITY`);
        for (const table of ordered) {
            const columns = structure[table].map(column => column.nombre);
            const insert = `INSERT INTO ${qualified(table)} (${columns.map(quote).join(',')}) VALUES (${columns.map((_, i) => '$' + (i + 1)).join(',')})`;
            for (const row of payload.tablas[table]) await client.query(insert, columns.map(column => row[column]));
            for (const column of columns) {
                const seq = (await client.query('SELECT pg_get_serial_sequence($1,$2) AS seq', ['public.' + table, column])).rows[0]?.seq;
                if (seq) await client.query(`SELECT setval($1::regclass, COALESCE(MAX(${quote(column)}),1), COUNT(*)>0) FROM ${qualified(table)}`, [seq]);
            }
        }
        return { restaurado: true, tablas: tables.length };
    });
}
module.exports = { exportData, restoreData, checksum };
