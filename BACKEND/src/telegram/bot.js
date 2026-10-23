const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs'); // Importado para encriptar la contraseña
const logger = require('../utils/logger');
const iaService = require('../services/iaService');
const audioService = require('../services/audioService');
const movimientosService = require('../services/movimientosService');
const reportesService = require('../services/reportesService');
const sessionService = require('../services/sessionService');
const usuariosModel = require('../models/usuariosModel'); // Importado para guardar correo/password
const db = require('../config/db');
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token || token === 'TU_TELEGRAM_BOT_TOKEN') {
  logger.error('BOT TELEGRAM: TELEGRAM_BOT_TOKEN no configurado o contiene el valor por defecto en .env. El bot no se iniciará.');
  module.exports = null;
  return;
}

// Inicializar el bot en modo polling
const bot = new TelegramBot(token, { polling: true });

logger.info('Bot de Telegram iniciado en modo Polling.');

// Manejar comandos básicos como /start y /ayuda
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const nombre = msg.from.first_name || 'Usuario';
  const username = msg.from.username || '';

  try {
    // 1. Asegurar que el usuario exista en la BD (tu flujo normal)
    await movimientosService.asegurarUsuario(telegramId, username, nombre).catch(() => {});

    // 2. 🔍 CONSULTA DE CONTROL: Traer el estado real y actualizado de sus credenciales web
    const resDB = await db.query('SELECT id, correo FROM usuarios WHERE telegram_id = $1 AND deleted_at IS NULL', [telegramId]);
    const usuario = resDB.rows[0];

    // 3. Verificamos si ya tiene correo. Si NO tiene (o es un usuario nuevo), iniciamos el registro web.
    if (!usuario || !usuario.correo) {
      const msjRegistro = `👋 *¡Hola, ${nombre}! Bienvenido a tu Asistente Financiero Inteligente.*\n\n` +
        `He creado tu perfil. Para que también puedas ver tus reportes gráficos en nuestra página web, vamos a vincular tu cuenta.\n\n` +
        `📧 *Por favor, escribe tu correo electrónico:*`;
      
      await bot.sendMessage(chatId, msjRegistro, { parse_mode: 'Markdown' });
      
      // Guardamos en memoria que estamos esperando su correo
      sessionService.setSession(telegramId, { estado: 'ESPERANDO_CORREO' });
      return; // Detenemos la ejecución aquí para que no mande la bienvenida normal
    }

    // 4. Si YA tiene correo registrado, se salta la entrevista y le da la bienvenida directa
    const bienvenida = `👋 *¡Qué bueno verte de nuevo, ${nombre}! Bienvenido a tu Asistente Financiero.*\n\n` +
      `Puedo ayudarte a llevar el control de tus finanzas personales de forma rápida mediante texto o notas de voz.\n\n` +
      `*¿Qué puedes hacer?*\n` +
      `• 📝 *Registrar gastos*: _"Gasté $15 en hamburguesas con tarjeta"_, _"Pagué 40 de luz"_\n` +
      `• 💰 *Registrar ingresos*: _"Me pagaron $800 de mi sueldo"_, _"Recibí 50 dólares en efectivo"_\n` +
      `• 🔄 *Registrar transferencias*: _"Transferí 100 de efectivo a ahorros"_\n` +
      `• 📊 *Consultar saldos y reportes*: _"Cuánto tengo?"_, _"Gastos de hoy"_, _"Resumen de este mes"_, _"Gastos por categoría"_\n\n` +
      `🎙️ ¡También puedes enviarme un *mensaje de voz* diciéndome qué compraste o cuánto gastaste!\n\n` +
      `Escribe /ayuda en cualquier momento para ver más ejemplos.`;

    await bot.sendMessage(chatId, bienvenida, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error en /start:', error);
    await bot.sendMessage(chatId, 'Hubo un error al iniciar tu cuenta. Por favor, intenta de nuevo más tarde.');
  }
});

bot.onText(/\/ayuda/, async (msg) => {
  const chatId = msg.chat.id;
  const ayuda = `📖 *Guía de Comandos y Ejemplos*\n\n` +
    `Puedes escribir de forma natural o enviar notas de voz. Aquí tienes algunos ejemplos:\n\n` +
    `*1. Registro de Movimientos:*\n` +
    `• _"Gasté 12 dólares en pizza con tarjeta"_\n` +
    `• _"Pagué $350 de renta de banco"_\n` +
    `• _"Recibí 1500 de salario en banco"_\n` +
    `• _"Pasé 50 de efectivo a ahorros"_\n\n` +
    `*2. Consultas y Reportes:*\n` +
    `• _"¿Cuánto dinero me queda?"_ (Balance general)\n` +
    `• _"Gastos de hoy"_ o _"¿Qué gasté hoy?"_\n` +
    `• _"Resumen mensual"_ o _"¿Cuánto he gastado este mes?"_\n` +
    `• _"¿Cuánto llevo gastado en comida?"_\n\n` +
    `*3. Comandos rápidos:* /balance, /hoy, /mes, /categorias`;
  
  await bot.sendMessage(chatId, ayuda, { parse_mode: 'Markdown' });
});

// Comandos explícitos de reportes
bot.onText(/\/balance/, (msg) => procesarComandoReporte(msg, 'balance'));
bot.onText(/\/hoy/, (msg) => procesarComandoReporte(msg, 'hoy'));
bot.onText(/\/mes/, (msg) => procesarComandoReporte(msg, 'mes'));
bot.onText(/\/categorias/, (msg) => procesarComandoReporte(msg, 'categorias'));

/**
 * Escucha general de todos los mensajes (texto y voz).
 */
bot.on('message', async (msg) => {
  // Ignorar comandos que empiezan por / (ya manejados arriba)
  if (msg.text && msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const username = msg.from.username || '';
  const nombre = msg.from.first_name || '';

  // 1. Detectar si es una nota de voz o un mensaje de texto
  let textoParaAnalizar = '';
  
  if (msg.voice) {
    try {
      await bot.sendChatAction(chatId, 'upload_document');
      logger.info(`Recibida nota de voz de ${nombre} (${telegramId})`);
      
      const fileId = msg.voice.file_id;
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const localFilePath = await bot.downloadFile(fileId, tempDir);
      
      await bot.sendChatAction(chatId, 'typing');
      textoParaAnalizar = await audioService.procesarYTranscribir(localFilePath);
      
      await bot.sendMessage(chatId, `🎙️ _Transcribiendo voz:_ "${textoParaAnalizar}"`, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Error al procesar la nota de voz:', error);
      await bot.sendMessage(chatId, '❌ Lo siento, no pude procesar o transcribir tu nota de voz.');
      return;
    }
  } else if (msg.text) {
    textoParaAnalizar = msg.text;
  } else {
    return;
  }

  // 2. Verificar si hay un flujo conversacional interactivo pendiente
  const session = sessionService.getSession(telegramId);

  // --- FLUJO 2.A: REGISTRO WEB (CORREO Y PASSWORD) ---
  if (session && session.estado === 'ESPERANDO_CORREO') {
    const correo = textoParaAnalizar.trim();
    
    if (!correo.includes('@') || !correo.includes('.')) {
      return bot.sendMessage(chatId, '⚠️ Ese no parece un correo válido. Por favor, intenta de nuevo:');
    }

    sessionService.setSession(telegramId, { estado: 'ESPERANDO_PASSWORD', correo: correo });
    return bot.sendMessage(chatId, '¡Excelente! ✅\n\n🔒 Ahora, *escribe una contraseña* para tu cuenta web:\n_(Tranquilo, la guardaré encriptada y nadie más podrá verla)_', { parse_mode: 'Markdown' });
  }

  if (session && session.estado === 'ESPERANDO_PASSWORD') {
    const password = textoParaAnalizar.trim();
    const correoGuardado = session.correo;

    try {
      const salt = bcrypt.genSaltSync(10);
      const hashPassword = bcrypt.hashSync(password, salt);

      await usuariosModel.VincularCuentaWeb(telegramId, correoGuardado, hashPassword);

      sessionService.clearSession(telegramId);
      
      const exito = `🎉 *¡Cuenta web vinculada con éxito!*\n\n` +
                    `Ya puedes ir a la página web e iniciar sesión con tu correo. A partir de ahora, cualquier gasto que me digas por aquí se reflejará en la web automáticamente.\n\n` +
                    `Escribe /ayuda si quieres ver cómo registrar un movimiento.`;
      return bot.sendMessage(chatId, exito, { parse_mode: 'Markdown' });
    } catch (error) {
      if (error.code === '23505') {
        sessionService.clearSession(telegramId);
        return bot.sendMessage(chatId, '❌ Hubo un problema: Ese correo ya está registrado en nuestro sistema. Usa /start para volver a intentar.');
      }
      logger.error('Error al guardar credenciales:', error);
      sessionService.clearSession(telegramId);
      return bot.sendMessage(chatId, 'Ocurrió un error al guardar tus datos. Inténtalo más tarde.');
    }
  }

  // --- FLUJO 2.B: RESOLUCIÓN DE FONDOS ---
  if (session && session.estado === 'ESPERANDO_ORIGEN_FONDOS') {
    try {
      await bot.sendChatAction(chatId, 'typing');
      const procedencia = await iaService.analizarProcedenciaFondos(textoParaAnalizar, session.faltante, session.cuenta);
      logger.debug('Resultado de análisis de procedencia de fondos:', procedencia);

      await ejecutarResolucionFondos(chatId, msg.from, session, procedencia);
    } catch (error) {
      logger.error('Error al resolver la procedencia de fondos:', error);
      await bot.sendMessage(chatId, '❌ Hubo un error al procesar tu respuesta. La operación pendiente ha sido cancelada.');
      sessionService.clearSession(telegramId);
    }
    return;
  }

  // 3. Procesar con NLP de IA (si no había sesión pendiente)
  try {
    await bot.sendChatAction(chatId, 'typing');
    const analisis = await iaService.procesarMensaje(textoParaAnalizar);
    logger.debug('Resultado de análisis IA:', analisis);

    // 4. Ejecutar acción de acuerdo a la intención detectada
    await ejecutarIntencionBot(chatId, msg.from, analisis);
  } catch (error) {
    logger.error('Error al ejecutar lógica de IA en mensaje:', error);
    await bot.sendMessage(chatId, '❌ Hubo un error al interpretar tu mensaje con la inteligencia artificial.');
  }
});

/**
 * Ejecuta la intención detectada por la IA.
 */
async function ejecutarIntencionBot(chatId, telegramUser, analisis) {
  const { id: telegram_id, username, first_name: nombre } = telegramUser;

  switch (analisis.intent) {
    case 'registrar_movimiento':
      if (!analisis.monto || !analisis.tipo) {
        await bot.sendMessage(
          chatId, 
          analisis.respuesta_conversacional || 'Necesito un monto y especificar si es un gasto, ingreso o transferencia para registrarlo. Ejemplo: "Gasté 15 dólares en pizza"'
        );
        return;
      }

      try {
        const result = await movimientosService.registrarMovimiento({
          telegram_id,
          username,
          nombre,
          tipo: analisis.tipo,
          categoria: analisis.categoria,
          monto: analisis.monto,
          cuenta_origen: analisis.cuenta_origen,
          cuenta_destino: analisis.cuenta_destino,
          descripcion: analisis.descripcion,
          metodo_pago: analisis.metodo_pago
        }, true);

        if (result.status === 'SALDO_INSUFICIENTE') {
          sessionService.setSession(telegram_id, {
            estado: 'ESPERANDO_ORIGEN_FONDOS',
            cuenta: result.cuenta,
            saldoActual: result.saldoActual,
            faltante: result.faltante,
            datosMovimiento: result.datosMovimiento
          });

          const msgPregunta = `⚠️ *Saldo Insuficiente en ${result.cuenta}*\n` +
            `Tu saldo actual es de *$${result.saldoActual.toFixed(2)}* y necesitas *$${result.datosMovimiento.monto.toFixed(2)}* (te faltan *$${result.faltante.toFixed(2)}*).\n\n` +
            `¿De dónde provienen esos *$${result.faltante.toFixed(2)}* de diferencia?\n` +
            `_(Ejemplos: "me los prestaron", "es un regalo", "los pasé del banco", "cancela")_`;

          await bot.sendMessage(chatId, msgPregunta, { parse_mode: 'Markdown' });
          return;
        }

        const m = result.movimiento;
        let responseMsg = '';

        if (m.tipo === 'INGRESO') {
          responseMsg = `🟢 *Ingreso Registrado*\n💰 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📂 Categoría: *${m.categoria || 'Otros'}*\n💳 Cuenta: *${m.cuenta_origen || 'Efectivo'}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
        } else if (m.tipo === 'GASTO') {
          responseMsg = `🔴 *Gasto Registrado*\n💸 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📂 Categoría: *${m.categoria || 'Otros'}*\n💳 Cuenta: *${m.cuenta_origen || 'Efectivo'}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
        } else if (m.tipo === 'TRANSFERENCIA') {
          responseMsg = `🔵 *Transferencia Registrada*\n🔄 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📤 Origen: *${m.cuenta_origen}*\n📥 Destino: *${m.cuenta_destino}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
        }

        await bot.sendMessage(chatId, responseMsg, { parse_mode: 'Markdown' });
      } catch (dbError) {
        logger.error('Error al registrar movimiento desde bot:', dbError);
        await bot.sendMessage(chatId, `❌ No se pudo registrar el movimiento. Detalles: ${dbError.message}`);
      }
      break;

    case 'consultar_balance': {
      const res = await reportesService.obtenerBalance(telegram_id, username, nombre);
      await bot.sendMessage(chatId, res.textoTelegram, { parse_mode: 'Markdown' });
      break;
    }
    case 'consultar_hoy': {
      const res = await reportesService.obtenerReporteHoy(telegram_id, username, nombre);
      await bot.sendMessage(chatId, res.textoTelegram, { parse_mode: 'Markdown' });
      break;
    }
    case 'consultar_mes':
    case 'consultar_gastos':
    case 'consultar_ingresos': {
      const res = await reportesService.obtenerReporteMes(telegram_id, username, nombre);
      await bot.sendMessage(chatId, res.textoTelegram, { parse_mode: 'Markdown' });
      break;
    }
    case 'consultar_categoria': {
      const res = await reportesService.obtenerReporteCategorias(telegram_id, username, nombre);
      await bot.sendMessage(chatId, res.textoTelegram, { parse_mode: 'Markdown' });
      break;
    }
    case 'saludo':
      await bot.sendMessage(chatId, analisis.respuesta_conversacional || `¡Hola! ¿Cómo te puedo ayudar con tus finanzas hoy?`);
      break;
    case 'ayuda':
    default:
      await bot.sendMessage(
        chatId, 
        analisis.respuesta_conversacional || `No he entendido del todo tu petición. ¿Podrías darme un comando? Escribe /ayuda para ver ejemplos.`
      );
      break;
  }
}

/**
 * Procesa peticiones directas de comandos de reportes (/balance, /hoy, etc).
 */
async function procesarComandoReporte(msg, tipo) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const username = msg.from.username || '';
  const nombre = msg.from.first_name || '';

  try {
    await bot.sendChatAction(chatId, 'typing');
    let res;
    if (tipo === 'balance') {
      res = await reportesService.obtenerBalance(telegramId, username, nombre);
    } else if (tipo === 'hoy') {
      res = await reportesService.obtenerReporteHoy(telegramId, username, nombre);
    } else if (tipo === 'mes') {
      res = await reportesService.obtenerReporteMes(telegramId, username, nombre);
    } else if (tipo === 'categorias') {
      res = await reportesService.obtenerReporteCategorias(telegramId, username, nombre);
    }

    await bot.sendMessage(chatId, res.textoTelegram, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(`Error en comando rápido /${tipo}:`, error);
    await bot.sendMessage(chatId, `❌ Error al obtener el reporte: ${error.message}`);
  }
}

/**
 * Ejecuta la resolución de fondos faltantes (INGRESO, TRANSFERENCIA, FORZAR o CANCELAR).
 */
async function ejecutarResolucionFondos(chatId, telegramUser, session, procedencia) {
  const { id: telegram_id, username, first_name: nombre } = telegramUser;
  const { tipo_procedencia, categoria, cuenta_origen, descripcion } = procedencia;
  const { faltante, cuenta: cuentaDestino, datosMovimiento } = session;

  sessionService.clearSession(telegram_id); // Limpiar sesión de inmediato

  if (tipo_procedencia === 'CANCELAR') {
    await bot.sendMessage(chatId, '❌ *Operación cancelada.* No se registró ningún movimiento.', { parse_mode: 'Markdown' });
    return;
  }

  try {
    if (tipo_procedencia === 'INGRESO') {
      // 1. Registrar ingreso de los fondos faltantes
      await movimientosService.registrarMovimiento({
        telegram_id,
        username,
        nombre,
        tipo: 'INGRESO',
        categoria: categoria || 'Otros',
        monto: faltante,
        cuenta_origen: cuentaDestino,
        cuenta_destino: cuentaDestino,
        descripcion: descripcion || 'Ingreso para cubrir saldo insuficiente',
        forzar: true
      });

      // 2. Registrar el movimiento original
      const resultOriginal = await movimientosService.registrarMovimiento({
        ...datosMovimiento,
        forzar: true 
      });

      const m = resultOriginal.movimiento;
      let msgConfirmacion = `🟢 *¡Fondos completados e ingreso registrado!*\n` +
        `📥 Se registró un ingreso de *$${faltante.toFixed(2)}* por: *${descripcion || 'Otros'}* en *${cuentaDestino}*.\n\n`;

      if (m.tipo === 'GASTO') {
        msgConfirmacion += `🔴 *Gasto Registrado*\n💸 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📂 Categoría: *${m.categoria || 'Otros'}*\n💳 Cuenta: *${m.cuenta_origen || 'Efectivo'}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
      } else if (m.tipo === 'TRANSFERENCIA') {
        msgConfirmacion += `🔵 *Transferencia Registrada*\n🔄 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📤 Origen: *${m.cuenta_origen}*\n📥 Destino: *${m.cuenta_destino}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
      }

      await bot.sendMessage(chatId, msgConfirmacion, { parse_mode: 'Markdown' });

    } else if (tipo_procedencia === 'TRANSFERENCIA') {
      // 1. Registrar transferencia del dinero faltante
      const cuentaOrigenNorm = cuenta_origen || 'Banco';
      
      await movimientosService.registrarMovimiento({
        telegram_id,
        username,
        nombre,
        tipo: 'TRANSFERENCIA',
        monto: faltante,
        cuenta_origen: cuentaOrigenNorm,
        cuenta_destino: cuentaDestino,
        descripcion: descripcion || 'Traspaso por saldo insuficiente',
        forzar: true
      });

      // 2. Registrar el movimiento original
      const resultOriginal = await movimientosService.registrarMovimiento({
        ...datosMovimiento,
        forzar: true
      });

      const m = resultOriginal.movimiento;
      let msgConfirmacion = `🔄 *¡Traspaso de fondos realizado!*\n` +
        `🔄 Se transfirieron *$${faltante.toFixed(2)}* de *${cuentaOrigenNorm}* a *${cuentaDestino}*.\n\n`;

      if (m.tipo === 'GASTO') {
        msgConfirmacion += `🔴 *Gasto Registrado*\n💸 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📂 Categoría: *${m.categoria || 'Otros'}*\n💳 Cuenta: *${m.cuenta_origen || 'Efectivo'}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
      } else if (m.tipo === 'TRANSFERENCIA') {
        msgConfirmacion += `🔵 *Transferencia Registrada*\n🔄 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📤 Origen: *${m.cuenta_origen}*\n📥 Destino: *${m.cuenta_destino}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
      }

      await bot.sendMessage(chatId, msgConfirmacion, { parse_mode: 'Markdown' });

    } else {
      // tipo_procedencia === 'FORZAR'
      const resultOriginal = await movimientosService.registrarMovimiento({
        ...datosMovimiento,
        forzar: true
      });

      const m = resultOriginal.movimiento;
      let msgConfirmacion = `⚠️ *Movimiento registrado (saldo negativo permitido)*\n\n`;

      if (m.tipo === 'GASTO') {
        msgConfirmacion += `🔴 *Gasto Registrado*\n💸 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📂 Categoría: *${m.categoria || 'Otros'}*\n💳 Cuenta: *${m.cuenta_origen || 'Efectivo'}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
      } else if (m.tipo === 'TRANSFERENCIA') {
        msgConfirmacion += `🔵 *Transferencia Registrada*\n🔄 Monto: *$${parseFloat(m.monto).toFixed(2)}*\n📤 Origen: *${m.cuenta_origen}*\n📥 Destino: *${m.cuenta_destino}*\n📝 Detalle: _${m.descripcion || 'Sin descripción'}_`;
      }

      await bot.sendMessage(chatId, msgConfirmacion, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    logger.error('Error al ejecutar resolución de fondos en BD:', error);
    await bot.sendMessage(chatId, `❌ No se pudo completar la operación: ${error.message}`);
  }
}

// Manejar errores de polling
bot.on('polling_error', (error) => {
  logger.error('Error de Polling de Telegram Bot:', error);
});

module.exports = bot;