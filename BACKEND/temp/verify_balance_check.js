require('dotenv').config();
const db = require('../src/config/db');
const movimientosService = require('../src/services/movimientosService');
const iaService = require('../src/services/iaService');
const logger = require('../src/utils/logger');

async function runTest() {
  const telegramId = 999999999;
  const username = 'testuser';
  const nombre = 'Test User';

  logger.info('--- 1. Inicializando usuario de pruebas y asegurando saldo de $30.00 en Efectivo ---');
  // Asegurar usuario
  const usuario = await movimientosService.asegurarUsuario(telegramId, username, nombre);
  logger.info(`Usuario creado/verificado con ID: ${usuario.id}`);

  // Limpiar/Reiniciar saldo de Efectivo de este usuario para la prueba
  const cuentasRes = await movimientosService.listarCuentasUsuario(telegramId);
  const efectivoCuenta = cuentasRes.cuentas.find(c => c.nombre === 'Efectivo');
  const saldoActual = parseFloat(efectivoCuenta?.saldo_actual || 0);

  logger.info(`Saldo actual de Efectivo: $${saldoActual.toFixed(2)}`);

  // Ajustar para tener exactamente $30.00 en Efectivo
  if (saldoActual !== 30.00) {
    const diferencia = 30.00 - saldoActual;
    if (diferencia > 0) {
      // Inyectar ingreso
      await movimientosService.registrarMovimiento({
        telegram_id: telegramId,
        username,
        nombre,
        tipo: 'INGRESO',
        monto: diferencia,
        cuenta_destino: 'Efectivo',
        descripcion: 'Ajuste de saldo inicial para test',
        forzar: true
      });
    } else {
      // Retirar gasto
      await movimientosService.registrarMovimiento({
        telegram_id: telegramId,
        username,
        nombre,
        tipo: 'GASTO',
        monto: Math.abs(diferencia),
        cuenta_origen: 'Efectivo',
        descripcion: 'Ajuste de saldo inicial para test',
        forzar: true
      });
    }
    logger.info('Saldo ajustado a exactamente $30.00 en Efectivo.');
  }

  logger.info('--- 2. Intentando registrar un gasto de $40.00 en comida (Debería fallar por saldo insuficiente) ---');
  const result = await movimientosService.registrarMovimiento({
    telegram_id: telegramId,
    username,
    nombre,
    tipo: 'GASTO',
    categoria: 'Comida',
    monto: 40.00,
    cuenta_origen: 'Efectivo',
    descripcion: 'Almuerzo de prueba'
  }, true); // validarSaldo = true

  logger.info(`Resultado de registrarMovimiento: ${JSON.stringify(result, null, 2)}`);
  if (result.status === 'SALDO_INSUFICIENTE') {
    logger.info('✅ VALIDACIÓN EXITOSA: El servicio bloqueó la operación y reportó SALDO_INSUFICIENTE.');
    logger.info(`Cuenta: ${result.cuenta}, Saldo: $${result.saldoActual}, Faltante: $${result.faltante}`);
  } else {
    logger.error('❌ ERROR: El servicio no detectó el saldo insuficiente.');
    process.exit(1);
  }

  logger.info('--- 3. Probando clasificación IA para procedencia de fondos ---');
  const respuestasPrueba = [
    { texto: 'me los prestaron', esperable: 'INGRESO' },
    { texto: 'los saqué de mi cuenta de banco', esperable: 'TRANSFERENCIA' },
    { texto: 'cancela la operación por favor', esperable: 'CANCELAR' },
    { texto: 'no sé, regístralo igual', esperable: 'FORZAR' }
  ];

  for (const prueba of respuestasPrueba) {
    logger.info(`Analizando respuesta: "${prueba.texto}"`);
    const resolucion = await iaService.analizarProcedenciaFondos(prueba.texto, result.faltante, result.cuenta);
    logger.info(`Clasificación IA: ${JSON.stringify(resolucion, null, 2)}`);
    if (resolucion.tipo_procedencia === prueba.esperable) {
      logger.info(`✅ OK: Clasificado correctamente como ${prueba.esperable}`);
    } else {
      logger.warn(`⚠️ ALERTA: Esperaba ${prueba.esperable} pero la IA devolvió ${resolucion.tipo_procedencia}`);
    }
  }

  logger.info('Prueba de backend completada exitosamente.');
  db.pool.end(); // Cerrar conexión
}

runTest().catch(err => {
  logger.error('Error durante la ejecución del test:', err);
  db.pool.end();
  process.exit(1);
});
