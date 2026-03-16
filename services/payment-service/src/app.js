require('./telemetry');
require('module-alias/register');

/**
 * Payment Service - Application Entry Point
 * 
 * Express server for the payment processing microservice.
 * Runs on port 3005 by default.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { connectDB } = require('./config/db');
const { createServiceLogger } = require('@shared/logger');
const { errorHandler, notFoundHandler, requestLogger } = require('@shared/middleware');
const { createHttpMetricsMiddleware, registerRuntimeMetrics } = require('@shared/observability');
const paymentRoutes = require('./routes/paymentRoutes');

const logger = createServiceLogger('payment-service');
const app = express();

registerRuntimeMetrics('payment-service');

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(createHttpMetricsMiddleware('payment-service'));
app.use(requestLogger(logger));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'payment-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api', paymentRoutes);

// ── Error Handling ───────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB(logger);
    app.listen(config.port, () => {
      logger.info(`Payment Service running on port ${config.port} [${config.nodeEnv}]`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error(`Failed to start Payment Service: ${error.message}`);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

startServer();

module.exports = app;
