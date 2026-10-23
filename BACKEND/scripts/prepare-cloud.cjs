'use strict';
process.env.APP_MODE='cloud';
const {validateCloudEnvironment}=require('../src/utils/runtimeConfig');
validateCloudEnvironment();
const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
// No demo users and no local records are copied into the public database.
db.withTransaction(async client=>{
 await client.query('SELECT pg_advisory_xact_lock(706102100)');
 for(const file of ['schema.sql','scripts/finance-schema.sql','scripts/currency-schema.sql','scripts/deployment-schema.sql']) {
  await client.query(fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^\uFEFF/,''));
 }
}).then(()=>console.log('Esquema público verificado; sin datos de demostración.'))
.catch(()=>{console.error('No se pudo preparar PostgreSQL. Revisa la conexión y sus permisos en Vercel.');process.exitCode=1;})
.finally(()=>db.pool.end());
