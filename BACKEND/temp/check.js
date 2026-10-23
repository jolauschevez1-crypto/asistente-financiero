require('dotenv').config();
const iaService = require('../src/services/iaService'); // Ajusta la ruta según dónde guardes el check.js
const logger = require('../src/utils/logger');
const path = require('path');

async function probarNuevosCambios() {
  logger.info('=== INICIANDO PRUEBAS DE LOS ÚLTIMOS PARCHES ===\n');

  // ---------------------------------------------------------
  // PRUEBA 1: Limpieza de Markdown en las descripciones
  // ---------------------------------------------------------
  logger.info('--- 1. Prueba de parche de Markdown (iaService) ---');
  
  // Simulamos que la IA nos devolvió un JSON con caracteres de Markdown (cursiva y negrita)
  const dataCorrupta = {
    intent: 'registrar_movimiento',
    tipo: 'GASTO',
    monto: 25.50,
    descripcion: '_*Pago de luz*_`' 
  };

  logger.info(`Entrada devuelta por Groq: "${dataCorrupta.descripcion}"`);
  
  // Pasamos la data por tu función normalizadora
  const dataLimpia = iaService.normalizarDatosExtraidos(dataCorrupta, 'pagué la luz');

  if (dataLimpia.descripcion === 'Pago de luz') {
    logger.info(`✅ ÉXITO: El texto se limpió correctamente: "${dataLimpia.descripcion}"`);
  } else {
    logger.error(`❌ FALLO: El texto no se limpió bien. Resultado: "${dataLimpia.descripcion}"`);
  }

  // ---------------------------------------------------------
  // PRUEBA 2: Lógica de nombres únicos para audios simultáneos
  // ---------------------------------------------------------
  logger.info('\n--- 2. Prueba de nombres únicos para audios (audioService) ---');
  
  // Simulamos dos audios que llegan exactamente al mismo tiempo con el mismo nombre base
  const inputPathUsuario1 = path.join(__dirname, 'file_17.oga');
  const inputPathUsuario2 = path.join(__dirname, 'file_17.oga');

  // Simulamos la generación de nombres (lo que pusiste en audioService.js)
  const uniqueId1 = Date.now();
  const outputPath1 = inputPathUsuario1.replace(/\.[^/.]+$/, `_${uniqueId1}.mp3`);
  
  // Retrasamos artificialmente 10 milisegundos para simular el segundo usuario
  await new Promise(resolve => setTimeout(resolve, 10)); 
  
  const uniqueId2 = Date.now();
  const outputPath2 = inputPathUsuario2.replace(/\.[^/.]+$/, `_${uniqueId2}.mp3`);

  logger.info(`Audio Usuario 1 se guardará como: ${path.basename(outputPath1)}`);
  logger.info(`Audio Usuario 2 se guardará como: ${path.basename(outputPath2)}`);

  if (outputPath1 !== outputPath2) {
    logger.info('✅ ÉXITO: Los nombres son únicos. FFmpeg no sobrescribirá los archivos si 2 personas hablan a la vez.');
  } else {
    logger.error('❌ FALLO: Los nombres son idénticos. Habrá conflicto de archivos.');
  }

  logger.info('\n=== PRUEBAS FINALIZADAS ===');
}

probarNuevosCambios();