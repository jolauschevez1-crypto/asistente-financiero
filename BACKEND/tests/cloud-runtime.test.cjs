'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {runtimeConfig,validateCloudEnvironment}=require('../src/utils/runtimeConfig');
test('nube exige configuración persistente y secretos independientes',()=>{
 assert.throws(()=>validateCloudEnvironment({VERCEL:'1',DB_ENGINE:'pglite'}),/persistente/);
 const env={VERCEL:'1',DB_ENGINE:'postgres',DATABASE_URL:'postgresql://example.invalid/db',JWT_SECRET:'a'.repeat(48),REFRESH_JWT_SECRET:'b'.repeat(48)};
 assert.doesNotThrow(()=>validateCloudEnvironment(env));
 assert.throws(()=>validateCloudEnvironment({...env,REFRESH_JWT_SECRET:env.JWT_SECRET}),/diferentes/);
});
test('CORS de producción acepta solo dominios propios declarados',()=>{
 const c=runtimeConfig({VERCEL:'1',APP_ORIGIN:'https://finanzas.example',VERCEL_URL:'preview.vercel.app'});
 assert.equal(c.allowsOrigin('https://finanzas.example'),true);
 assert.equal(c.allowsOrigin('https://preview.vercel.app'),true);
 assert.equal(c.allowsOrigin('https://otra.vercel.app'),false);
 assert.equal(c.allowsOrigin('http://localhost:3001'),false);
 assert.equal(runtimeConfig({}).allowsOrigin('http://127.0.0.1:3001'),true);
});
test('dos instancias comparten límite atómico sin almacenar IP, con expiración y decremento',async()=>{
 const {PGlite}=require('@electric-sql/pglite');
 const {PostgresRateLimitStore}=require('../src/utils/postgresRateLimitStore');
 const db=await PGlite.create();
 try{
  await db.exec(require('node:fs').readFileSync(require('node:path').join(__dirname,'../scripts/deployment-schema.sql'),'utf8'));
  const a=new PostgresRateLimitStore(db,'test-secret','auth'),b=new PostgresRateLimitStore(db,'test-secret','auth');
  a.init({windowMs:60000});b.init({windowMs:60000});
  const values=await Promise.all([a.increment('203.0.113.1'),b.increment('203.0.113.1'),a.increment('203.0.113.1')]);
  assert.deepEqual(values.map(x=>x.totalHits).sort(),[1,2,3]);
  const row=(await db.query('SELECT * FROM af_rate_limits')).rows[0];
  assert.match(row.key_hash,/^[0-9a-f]{64}$/);assert.equal(row.total_hits,3);
  await b.decrement('203.0.113.1');assert.equal((await a.increment('203.0.113.1')).totalHits,3);
  await db.query("UPDATE af_rate_limits SET reset_time=CURRENT_TIMESTAMP-INTERVAL '1 second'");
  assert.equal((await b.increment('203.0.113.1')).totalHits,1);
  await a.resetKey('203.0.113.1');assert.equal((await db.query('SELECT * FROM af_rate_limits')).rows.length,0);
 }finally{await db.close();}
});
