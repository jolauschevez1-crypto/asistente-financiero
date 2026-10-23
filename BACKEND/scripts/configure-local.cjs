const fs = require('node:fs');
const path = require('node:path');
const {randomBytes} = require('node:crypto');
const root = path.resolve(__dirname,'..');
const target = path.join(root,'.env');
if (!fs.existsSync(target)) {
    const template = fs.readFileSync(path.join(root,'.env.example'),'utf8')
        .replace('GENERAR_UN_SECRETO_ALEATORIO_LOCAL',randomBytes(48).toString('hex'))
        .replace('GENERAR_OTRO_SECRETO_ALEATORIO_LOCAL',randomBytes(48).toString('hex'));
    fs.writeFileSync(target,template,{flag:'wx'});
    console.log('Configuración local creada con secretos aleatorios propios de esta instalación.');
}
const settings = require('dotenv').parse(fs.readFileSync(target));
if (settings.DB_ENGINE !== 'pglite' || !['127.0.0.1','localhost'].includes(settings.HOST) || settings.PORT !== '3001') {
    console.error('El inicio local necesita DB_ENGINE=pglite, HOST=127.0.0.1 y PORT=3001 en BACKEND/.env.');
    process.exitCode=1;
}
if (settings.AI_PROVIDER !== 'disabled' || settings.TELEGRAM_ENABLED !== 'false' || settings.SMTP_ENABLED !== 'false' || settings.GOOGLE_CLIENT_ID) {
    console.error('Desactiva IA, Telegram, correo y Google en .env para esta instalación local.');
    process.exitCode=1;
}
