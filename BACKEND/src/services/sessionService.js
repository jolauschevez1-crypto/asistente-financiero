const logger = require('../utils/logger');

class SessionService {
  constructor() {
    this.sessions = new Map();
    // Expiración por defecto: 5 minutos
    this.timeoutMs = 5 * 60 * 1000;
  }

  /**
   * Guarda o actualiza la sesión del usuario.
   */
  setSession(telegramId, data) {
    this.sessions.set(telegramId, {
      ...data,
      timestamp: Date.now()
    });
    logger.debug(`Sesión iniciada/actualizada para usuario ${telegramId}`);
  }

  /**
   * Obtiene la sesión activa del usuario, si no ha expirado.
   */
  getSession(telegramId) {
    const session = this.sessions.get(telegramId);
    if (!session) return null;

    if (Date.now() - session.timestamp > this.timeoutMs) {
      logger.info(`Sesión del usuario ${telegramId} expirada por inactividad.`);
      this.sessions.delete(telegramId);
      return null;
    }

    return session;
  }

  /**
   * Elimina la sesión del usuario.
   */
  clearSession(telegramId) {
    if (this.sessions.has(telegramId)) {
      this.sessions.delete(telegramId);
      logger.debug(`Sesión eliminada para usuario ${telegramId}`);
    }
  }
}

module.exports = new SessionService();
