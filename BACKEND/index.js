process.env.TZ='America/Guayaquil';
require('dotenv').config();
const {initialize}=require('./scripts/init-local');
const db=require('./src/config/db');
async function main(){
 if(!process.env.JWT_SECRET||!process.env.REFRESH_JWT_SECRET)throw new Error('Configura secretos JWT locales antes de iniciar.');
 await initialize();
 const app=require('./src/app');
 if(process.env.TELEGRAM_ENABLED==='true')require('./src/telegram/bot');
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3001);
 const server=app.listen(port,host,()=>{console.log(`Asistente Financiero local: http://${host}:${port}`);if(process.argv.includes('--open')&&process.platform==='win32'&&host==='127.0.0.1'&&port===3001){require('node:child_process').spawn('powershell.exe',['-NoProfile','-Command',"Start-Process 'http://127.0.0.1:3001'"],{windowsHide:true,stdio:'ignore'}).unref();}});
 server.on('error',error=>{console.error(error.message);db.pool.end().finally(()=>process.exit(1));});
 const close=()=>server.close(()=>db.pool.end().finally(()=>process.exit(0)));
 process.once('SIGINT',close);process.once('SIGTERM',close);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;db.pool.end();});
