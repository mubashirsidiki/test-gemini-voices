/**
 * Logging Utility
 * Provides structured, pretty logging throughout the application
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Format timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log message with context
 */
function formatLog(level, message, context = {}) {
  const timestamp = getTimestamp();
  const contextStr = Object.keys(context).length > 0 
    ? `\n${JSON.stringify(context, null, 2)}` 
    : '';
  
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

/**
 * Server-side logger (for API endpoints)
 */
export const serverLogger = {
  debug: (message, context = {}) => {
    console.log(`${COLORS.dim}${formatLog('DEBUG', message, context)}${COLORS.reset}`);
  },
  
  info: (message, context = {}) => {
    console.log(`${COLORS.cyan}${formatLog('INFO', message, context)}${COLORS.reset}`);
  },
  
  warn: (message, context = {}) => {
    console.warn(`${COLORS.yellow}${formatLog('WARN', message, context)}${COLORS.reset}`);
  },
  
  error: (message, error = null, context = {}) => {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };
    console.error(`${COLORS.red}${formatLog('ERROR', message, errorContext)}${COLORS.reset}`);
  },
  
  success: (message, context = {}) => {
    console.log(`${COLORS.green}${formatLog('SUCCESS', message, context)}${COLORS.reset}`);
  }
};

/**
 * Client-side logger (for browser)
 */
export const clientLogger = {
  debug: (message, context = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`%c[DEBUG] ${message}`, 'color: #888; font-weight: normal', context);
    }
  },
  
  info: (message, context = {}) => {
    console.log(`%c[INFO] ${message}`, 'color: #0ea5e9; font-weight: bold', context);
  },
  
  warn: (message, context = {}) => {
    console.warn(`%c[WARN] ${message}`, 'color: #f59e0b; font-weight: bold', context);
  },
  
  error: (message, error = null, context = {}) => {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };
    console.error(`%c[ERROR] ${message}`, 'color: #ef4444; font-weight: bold', errorContext);
  },
  
  success: (message, context = {}) => {
    console.log(`%c[SUCCESS] ${message}`, 'color: #10b981; font-weight: bold', context);
  },
  
  api: (method, endpoint, data = {}) => {
    console.log(
      `%c[API] ${method} ${endpoint}`,
      'color: #6366f1; font-weight: bold; background: #f3f4f6; padding: 2px 6px; border-radius: 3px',
      data
    );
  }
};

