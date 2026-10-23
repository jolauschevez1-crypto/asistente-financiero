const logger = {
  info: (message, ...meta) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...meta);
  },
  error: (message, error, ...meta) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || '', ...meta);
  },
  warn: (message, ...meta) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...meta);
  },
  debug: (message, ...meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...meta);
    }
  }
};

module.exports = logger;
