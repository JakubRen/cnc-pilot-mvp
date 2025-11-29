/**
 * Structured Logger Utility
 * - JSON format in production (for Vercel Logs)
 * - Pretty format in development
 * - Context tracking (orderId, userId, companyId)
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  context?: Record<string, unknown>;
}

interface LogContext {
  orderId?: string;
  userId?: string | number;
  companyId?: string;
  endpoint?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext) {
  // Skip debug logs in production
  if (level === 'debug' && process.env.NODE_ENV === 'production') {
    return;
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'cnc-pilot',
    context,
  };

  // In development - pretty formatted
  if (process.env.NODE_ENV === 'development') {
    const emoji = { info: 'ℹ️', warn: '⚠️', error: '❌', debug: '🔍' }[level];
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    console.log(`${emoji} [${level.toUpperCase()}] ${message}${contextStr}`);
  } else {
    // In production - JSON for Vercel Logs
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  /**
   * Info level - for important business events
   * @example logger.info('Order created', { orderId: order.id, userId: user.id })
   */
  info: (msg: string, ctx?: LogContext) => log('info', msg, ctx),

  /**
   * Warning level - for potential issues
   * @example logger.warn('Low stock detected', { itemId: item.id, quantity: 5 })
   */
  warn: (msg: string, ctx?: LogContext) => log('warn', msg, ctx),

  /**
   * Error level - for errors and exceptions
   * @example logger.error('Database query failed', { error: error.message, query: 'orders.insert' })
   */
  error: (msg: string, ctx?: LogContext) => log('error', msg, ctx),

  /**
   * Debug level - for development debugging (not logged in production)
   * @example logger.debug('Processing order', { orderId, step: 'validation' })
   */
  debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),
};

// Usage examples (commented out):
// logger.info('Order created', { orderId: 'abc-123', userId: 45, companyId: 'xyz' });
// logger.warn('Low stock detected', { itemId: 'item-1', quantity: 5, threshold: 10 });
// logger.error('Database query failed', { error: 'timeout', query: 'orders.insert' });
// logger.debug('Processing step', { step: 'validation', data: { foo: 'bar' } });
