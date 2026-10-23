const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config();
const engine = process.env.DB_ENGINE || 'pglite';
if ((process.env.VERCEL === '1' || process.env.APP_MODE === 'cloud') && engine !== 'postgres') throw new Error('La nube requiere PostgreSQL persistente.');
let pool;
if (engine === 'pglite') {
    const { PGlite } = require('@electric-sql/pglite');
    const dir = process.env.PGLITE_DATA_DIR || './data/local';
    const location = dir === 'memory://' ? dir : path.resolve(__dirname, '../..', dir);
    let lockPath;
    if(location !== 'memory://') {
        fs.mkdirSync(location,{recursive:true});
        lockPath=path.join(location,'.asistente.lock');
        if(fs.existsSync(lockPath)) {
            const pid=Number(fs.readFileSync(lockPath,'utf8'));
            let running=true;
            try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')running=false;}
            if(running) throw new Error('La base local ya está abierta. Cierra el servidor antes de ejecutar otro comando de base de datos.');
            fs.unlinkSync(lockPath);
        }
        fs.writeFileSync(lockPath,String(process.pid),{flag:'wx'});
    }
    const ready = PGlite.create(location);
    // Retain the single-connection mutex for the whole transaction, including outside queries.
    let tail = Promise.resolve();
    async function connect() {
        const previous = tail;
        let unlock;
        tail = new Promise(resolve => { unlock = resolve; });
        await previous;
        let pg;
        try { pg = await ready; } catch (error) { unlock(); throw error; }
        let released = false;
        return {
            async query(sql, params) {
                if (released) throw new Error('Cliente de base de datos liberado.');
                const result = (params ? await pg.query(sql, params) : (await pg.exec(sql)).at(-1)) || {};
                return { ...result, rows: result.rows || [], rowCount: result.affectedRows || result.rows?.length || 0 };
            },
            release() { if (!released) { released = true; unlock(); } },
        };
    }
    pool = {
        connect,
        async query(sql, params) {
            const client = await connect();
            try { return await client.query(sql, params); } finally { client.release(); }
        },
        async end() { try { await tail; await (await ready).close(); } finally { if(lockPath && fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } },
        on() {},
    };
} else if (engine === 'postgres') {
    const { Pool } = require('pg');
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es requerida para DB_ENGINE=postgres.');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
    // TLS follows the URL. Certificate verification is never disabled here.
    pool.on('error', () => console.error('Error en conexión PostgreSQL.'));
} else throw new Error('DB_ENGINE debe ser pglite o postgres.');
async function withTransaction(fn) {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
}
module.exports = { pool, query: (sql, params) => pool.query(sql, params), withTransaction, engine };
