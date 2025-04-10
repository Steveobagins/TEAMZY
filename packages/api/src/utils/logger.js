// packages/api/src/utils/logger.js

// Basic console logger implementation
// TODO: Replace with a more robust logger like Winston or Pino for production
const log = {
    info: (...args) => {
        console.log(`[INFO] ${new Date().toISOString()}:`, ...args);
    },
    warn: (...args) => {
        console.warn(`[WARN] ${new Date().toISOString()}:`, ...args);
    },
    error: (error, ...args) => {
        // Log the error object itself for stack trace, plus any additional context
        console.error(`[ERROR] ${new Date().toISOString()}:`, error, ...args);
    },
    debug: (...args) => {
        // Only log debug messages if NODE_ENV is 'development' (or explicitly enabled)
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()}:`, ...args);
        }
    },
};

export default log;