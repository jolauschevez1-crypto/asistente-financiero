// src/controllers/ia.Controller.js

const iaService = require('../services/iaService');
const logger = require('../utils/logger');
const { mapRespuestaIA } = require('../dtos/iaDto');

class IaController {
  /**
   * Procesa un mensaje de texto para extraer intenciones y entidades.
   * @route POST /api/ia/procesar
   */
  async procesarMensaje(req, res, next) {
    try {
      const { texto } = req.body;
      if (!texto) {
        return res.status(400).json({
          success: false,
          message: 'El campo "texto" es requerido en el cuerpo de la petición.'
        });
      }

      const analisis = await iaService.procesarMensaje(texto);
      return res.status(200).json({
        success: true,
        data: analisis
      });
    } catch (error) {
      logger.error('Error al procesar mensaje de IA:', error);
      next(error);
    }
  }

  /**
   * Responde una pregunta libre del usuario autenticado sobre sus propias finanzas.
   * @route POST /api/ia/preguntar
   */
  async preguntar(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const { pregunta, historial } = req.body;
      if (!pregunta) {
        return res.status(400).json({
          success: false,
          message: 'El campo "pregunta" es requerido en el cuerpo de la petición.'
        });
      }

      const resultado = await iaService.responderPregunta(usuarioId, pregunta, req.usuario.rol, historial || []);
      return res.status(200).json({ success: true, data: mapRespuestaIA(resultado.respuesta, resultado.meta) });
    } catch (error) {
      logger.error('Error en IA preguntar:', error);
      next(error);
    }
  }

  /**
   * Analiza los gastos del usuario autenticado.
   * @route GET /api/ia/analizar-gastos
   */
  async analizarGastosWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await iaService.analizarGastos(usuarioId, req.usuario.rol);
      return res.status(200).json({ success: true, data: mapRespuestaIA(resultado.respuesta, resultado.meta) });
    } catch (error) {
      logger.error('Error en IA analizar gastos:', error);
      next(error);
    }
  }

  /**
   * Analiza los ingresos del usuario autenticado.
   * @route GET /api/ia/analizar-ingresos
   */
  async analizarIngresosWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await iaService.analizarIngresos(usuarioId, req.usuario.rol);
      return res.status(200).json({ success: true, data: mapRespuestaIA(resultado.respuesta, resultado.meta) });
    } catch (error) {
      logger.error('Error en IA analizar ingresos:', error);
      next(error);
    }
  }

  /**
   * Detecta posibles gastos innecesarios del usuario autenticado.
   * @route GET /api/ia/gastos-innecesarios
   */
  async gastosInnecesariosWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await iaService.detectarGastosInnecesarios(usuarioId, req.usuario.rol);
      return res.status(200).json({ success: true, data: mapRespuestaIA(resultado.respuesta, resultado.meta) });
    } catch (error) {
      logger.error('Error en IA gastos innecesarios:', error);
      next(error);
    }
  }

  /**
   * Genera un reporte financiero narrativo del usuario autenticado.
   * @route GET /api/ia/reporte
   */
  async reporteNarrativoWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await iaService.generarReporteNarrativo(usuarioId, req.usuario.rol);
      return res.status(200).json({ success: true, data: mapRespuestaIA(resultado.respuesta, resultado.meta) });
    } catch (error) {
      logger.error('Error en IA reporte narrativo:', error);
      next(error);
    }
  }

  /**
   * Genera una predicción financiera del usuario autenticado.
   * @route GET /api/ia/prediccion
   */
  async prediccionWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await iaService.generarPrediccion(usuarioId, req.usuario.rol);
      return res.status(200).json({ success: true, data: mapRespuestaIA(resultado.respuesta, resultado.meta) });
    } catch (error) {
      logger.error('Error en IA prediccion:', error);
      next(error);
    }
  }

  /**
   * Genera consejos financieros personalizados para el usuario autenticado.
   * @route GET /api/ia/consejos
   */
  async consejosWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const resultado = await iaService.generarConsejos(usuarioId, req.usuario.rol);
      return res.status(200).json({ success: true, data: mapRespuestaIA(resultado.respuesta, resultado.meta) });
    } catch (error) {
      logger.error('Error en IA consejos:', error);
      next(error);
    }
  }
}

module.exports = new IaController();
