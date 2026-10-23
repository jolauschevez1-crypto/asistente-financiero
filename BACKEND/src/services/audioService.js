const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../utils/logger');
const groqService = require('./groqService');

let ffmpegPath = null;
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  ffmpegPath = ffmpegInstaller.path;
  logger.info(`Usando FFmpeg portátil desde: ${ffmpegPath}`);
} catch (err) {
  logger.warn('No se pudo cargar @ffmpeg-installer/ffmpeg de manera local. Se intentará usar comando global.');
}

class AudioService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Obtiene la ruta ejecutable de ffmpeg (portátil o global).
   * @returns {Promise<string|null>} Comando/Ruta de ejecución de ffmpeg o null si no se encuentra.
   */
  async obtenerFfmpegCommand() {
    if (ffmpegPath && fs.existsSync(ffmpegPath)) {
      return `"${ffmpegPath}"`;
    }
    
    // Si no está el instalador, probar si hay comando global
    return new Promise((resolve) => {
      exec('ffmpeg -version', (error) => {
        if (error) {
          logger.warn('FFmpeg no está disponible ni en modo local ni global.');
          resolve(null);
        } else {
          resolve('ffmpeg');
        }
      });
    });
  }

  /**
   * Convierte un archivo de audio (.oga) a (.mp3).
   * @param {string} inputPath - Ruta del archivo .oga de entrada.
   * @returns {Promise<string>} Ruta del archivo .mp3 de salida.
   */
  convertirAFormatomp3(inputPath) {
    return new Promise(async (resolve, reject) => {
      const ffmpegCmd = await this.obtenerFfmpegCommand();
      if (!ffmpegCmd) {
        // Fallback: Si no hay ffmpeg, intentamos usar el archivo original directamente
        logger.warn('No se puede convertir el audio (FFmpeg ausente). Se intentará enviar el archivo original.');
        return resolve(inputPath);
      }

      const uniqueId = Date.now(); // Genera un número único basado en la hora exacta
const outputPath = inputPath.replace(/\.[^/.]+$/, `_${uniqueId}.mp3`);
      const command = `${ffmpegCmd} -y -i "${inputPath}" -acodec libmp3lame -aq 4 "${outputPath}"`;

      logger.info(`Convirtiendo audio: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Error al convertir audio con FFmpeg:', error);
          // Si falla, intentamos devolver el original para no interrumpir el flujo
          return resolve(inputPath);
        }
        
        logger.debug('Conversión de audio completada con éxito.');
        resolve(outputPath);
      });
    });
  }

  /**
   * Procesa el audio de Telegram completando la transcripción.
   * @param {string} ogaFilePath - Ruta del archivo descargado de Telegram (.oga).
   * @returns {Promise<string>} Texto transcrito.
   */
  async procesarYTranscribir(ogaFilePath) {
    let mp3FilePath = null;
    try {
      // 1. Convertir oga a mp3
      mp3FilePath = await this.convertirAFormatomp3(ogaFilePath);

      // 2. Enviar a Whisper en Groq
      logger.info(`Enviando archivo para transcripción: ${mp3FilePath}`);
      const transcripcion = await groqService.transcribeAudio(mp3FilePath);
      
      logger.info('Transcripción obtenida con éxito:', transcripcion.text);
      return transcripcion.text;
    } catch (error) {
      logger.error('Error durante el proceso de transcripción de audio:', error);
      throw error;
    } finally {
      // 3. Limpieza de archivos temporales
      this.limpiarArchivo(ogaFilePath);
      if (mp3FilePath && mp3FilePath !== ogaFilePath) {
        this.limpiarArchivo(mp3FilePath);
      }
    }
  }

  /**
   * Elimina de forma segura un archivo del disco.
   */
  limpiarArchivo(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.debug(`Archivo temporal eliminado: ${filePath}`);
      } catch (err) {
        logger.error(`No se pudo eliminar el archivo temporal: ${filePath}`, err);
      }
    }
  }
}

module.exports = new AudioService();