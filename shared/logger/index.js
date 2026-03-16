/**
 * Shared Logger Module
 * 
 * Centralized logging utility used across all microservices.
 * Uses Winston for structured, level-based logging with
 * support for console and file transports.
 * 
 * Log Levels: error > warn > info > http > debug
 */

const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = format;
const logsDirectory = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

// Custom log format for readable output
const logFormat = printf(({ level, message, timestamp, stack, service }) => {
  const svc = service ? `[${service}]` : '';
  return `${timestamp} ${level} ${svc}: ${stack || message}`;
});

/**
 * Creates a configured Winston logger instance for a specific service.
 * 
 * @param {string} serviceName - Name of the microservice (e.g., 'user-service')
 * @returns {import('winston').Logger} Configured Winston logger
 * 
 * @example
 * const logger = createServiceLogger('user-service');
 * logger.info('Server started on port 3001');
 * logger.error('Database connection failed', { error: err.message });
 */
const createServiceLogger = (serviceName) => {
  const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
    transports: [
      // Console transport with colorized output
      new transports.Console({
        format: combine(colorize(), logFormat)
      }),
      // File transport for error logs
      new transports.File({
        filename: path.join(logsDirectory, `${serviceName}-error.log`),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      // File transport for combined logs
      new transports.File({
        filename: path.join(logsDirectory, `${serviceName}-combined.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ],
    // Do not exit on uncaught exceptions
    exitOnError: false
  });

  return logger;
};

module.exports = { createServiceLogger };
