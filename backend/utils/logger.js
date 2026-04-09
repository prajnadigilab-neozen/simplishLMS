const pino = require('pino');
const Sentry = require('@sentry/node');

/**
 * High-performance structured logging with Pino.
 * Uses 'pino-pretty' in development for human-readability.
 * Integrated with Sentry for real-time error tracking in production.
 */
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        }
    } : undefined,
    // Production settings: JSON output (default), faster, but no pretty-print
    timestamp: pino.stdTimeFunctions.isoTime,
});

// 🔐 SRE Integration: Auto-capture logger.error to Sentry
const originalError = logger.error.bind(logger);
logger.error = (obj, ...args) => {
    if (obj && (obj instanceof Error || obj.err || obj.error)) {
        const errorToCapture = obj instanceof Error ? obj : (obj.err || obj.error);
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(errorToCapture, {
                extra: typeof obj === 'object' ? obj : { message: obj }
            });
        }
    }
    return originalError(obj, ...args);
};

module.exports = logger;
