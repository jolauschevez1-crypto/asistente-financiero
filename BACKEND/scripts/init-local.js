const fs=require('node:fs');
const path=require('node:path');
const db=require('../src/config/db');
async function initialize(){
 await db.query(fs.readFileSync(path.join(__dirname,'../schema.sql'),'utf8').replace(/^\uFEFF/,''));
 for(const name of ['finance-schema.sql','currency-schema.sql','multidivisa-schema.sql','deployment-schema.sql']) {
  const extra=path.join(__dirname,name);
  if(fs.existsSync(extra)) await db.query(fs.readFileSync(extra,'utf8').replace(/^\uFEFF/,''));
 }
}
if(require.main===module) initialize().then(()=>console.log('Base de datos local inicializada.')).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.pool.end());
module.exports={initialize};
