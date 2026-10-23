// src/controllers/reportesController.js
const reportesService = require('../services/reportesService');
const movimientosModel = require('../models/movimientosModel'); // Importado para extraer datos limpios para la Web
const logger = require('../utils/logger');

class ReportesController {
  // ==========================================
  // CONTROLADORES TELEGRAM (Devuelven Texto/Emojis)
  // ==========================================

  /**
   * Devuelve el balance total del usuario de Telegram (formato bot).
   * @route GET /api/reportes/telegram/balance
   */
  async balance(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });

      const result = await reportesService.obtenerBalance(telegramId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error al obtener balance (telegram):', error);
      next(error);
    }
  }

  /**
   * Devuelve el reporte del dia para el usuario de Telegram (formato bot).
   * @route GET /api/reportes/telegram/hoy
   */
  async hoy(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });

      const result = await reportesService.obtenerReporteHoy(telegramId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error al obtener reporte de hoy (telegram):', error);
      next(error);
    }
  }

  /**
   * Devuelve el reporte del mes para el usuario de Telegram (formato bot).
   * @route GET /api/reportes/telegram/mes
   */
  async mes(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });

      const result = await reportesService.obtenerReporteMes(telegramId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error al obtener reporte del mes (telegram):', error);
      next(error);
    }
  }

  /**
   * Devuelve el reporte de gastos por categoria para el usuario de Telegram (formato bot).
   * @route GET /api/reportes/telegram/categorias
   */
  async categorias(req, res, next) {
    try {
      const telegramId = req.query.telegram_id || req.headers['x-telegram-id'];
      if (!telegramId) return res.status(400).json({ success: false, message: 'El parámetro telegram_id es requerido.' });

      const result = await reportesService.obtenerReporteCategorias(telegramId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error al obtener reporte de categorias (telegram):', error);
      next(error);
    }
  }

  // ==========================================
  // CONTROLADORES WEB (Devuelven JSON limpio para Angular)
  // ==========================================

  /**
   * Devuelve el balance total y las cuentas del usuario autenticado.
   * @route GET /api/reportes/web/balance
   */
  async balanceWeb(req, res, next) {
    try {
      // El ID real de PostgreSQL ya viene inyectado gracias al auth.middleware
      const usuarioId = req.usuario.id;

      const balanceTotal = await movimientosModel.obtenerBalanceTotal(usuarioId);
      const cuentas = await movimientosModel.listarCuentas(usuarioId);

      return res.status(200).json({
        success: true,
        balance_total: balanceTotal,
        cuentas: cuentas
      });
    } catch (error) {
      logger.error('Error al obtener balance (web):', error);
      next(error);
    }
  }

  /**
   * Devuelve el resumen de movimientos del dia del usuario autenticado.
   * @route GET /api/reportes/web/hoy
   */
  async hoyWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const movimientos = await movimientosModel.obtenerResumenHoy(usuarioId);

      return res.status(200).json({
        success: true,
        movimientos
      });
    } catch (error) {
      logger.error('Error al obtener resumen de hoy (web):', error);
      next(error);
    }
  }

  /**
   * Devuelve el resumen de movimientos del mes del usuario autenticado.
   * @route GET /api/reportes/web/mes
   */
  async mesWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const movimientos = await movimientosModel.obtenerResumenMes(usuarioId);

      return res.status(200).json({
        success: true,
        movimientos
      });
    } catch (error) {
      logger.error('Error al obtener resumen del mes (web):', error);
      next(error);
    }
  }

  /**
   * Devuelve los gastos por categoria del mes del usuario autenticado.
   * @route GET /api/reportes/web/categorias
   */
  async categoriasWeb(req, res, next) {
    try {
      const usuarioId = req.usuario.id;
      const categorias = await movimientosModel.obtenerGastosCategoriaMes(usuarioId);

      return res.status(200).json({
        success: true,
        categorias
      });
    } catch (error) {
      logger.error('Error al obtener gastos por categoria (web):', error);
      next(error);
    }
  }
}

module.exports = new ReportesController();
