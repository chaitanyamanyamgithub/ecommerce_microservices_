/**
 * Payment Service Layer
 * 
 * Business logic for payment processing.
 * In production, this would integrate with Stripe, PayPal, etc.
 * Currently simulates payment processing for development.
 */

const { v4: uuidv4 } = require('uuid');
const { metrics } = require('@opentelemetry/api');
const { createServiceLogger } = require('@shared/logger');
const Payment = require('../models/Payment');
const { AppError } = require('@shared/utils');

const logger = createServiceLogger('payment-service');
const meter = metrics.getMeter('payment-service');
const paymentRequestsCounter = meter.createCounter('payment_requests', {
  description: 'Payment attempts grouped by outcome and method.'
});
const paymentDurationHistogram = meter.createHistogram('payment_duration', {
  description: 'Time spent processing payments.',
  unit: 'ms'
});

/**
 * Process a payment for an order.
 * 
 * NOTE: This is a simulated payment processor for development.
 * In production, replace the simulatePaymentGateway function
 * with actual Stripe/PayPal SDK integration.
 * 
 * @param {object} paymentData - Payment details
 * @returns {Promise<object>} Payment document
 * 
 * Example request body:
 * {
 *   "orderId": "64d4e5f6789012abcde01234",
 *   "userId": "64a1b2c3d4e5f6789012abcd",
 *   "amount": 179.97,
 *   "currency": "USD",
 *   "method": "credit_card"
 * }
 * 
 * Example response:
 * {
 *   "success": true,
 *   "message": "Payment processed successfully",
 *   "data": {
 *     "_id": "...",
 *     "orderId": "...",
 *     "userId": "...",
 *     "amount": 179.97,
 *     "currency": "USD",
 *     "method": "credit_card",
 *     "status": "completed",
 *     "transactionId": "txn_a1b2c3d4-e5f6-7890-abcd-ef0123456789"
 *   }
 * }
 */
const processPayment = async (paymentData) => {
  const startedAt = Date.now();
  const { orderId, userId, amount, currency = 'INR', method = 'credit_card' } = paymentData;

  logger.info(`Payment processing started for order ${orderId} using ${method}`);

  // Check for duplicate payment on the same order
  const existingPayment = await Payment.findOne({
    orderId,
    status: { $in: ['completed', 'processing'] }
  });

  if (existingPayment) {
    paymentRequestsCounter.add(1, { status: 'duplicate', method });
    throw new AppError('Payment already exists for this order', 409);
  }

  // Generate unique transaction ID
  const transactionId = `txn_${uuidv4()}`;

  // Create payment record with 'processing' status
  const payment = await Payment.create({
    orderId,
    userId,
    amount,
    currency,
    method,
    transactionId,
    status: 'processing',
    metadata: {
      ipAddress: paymentData.ipAddress || 'unknown',
      userAgent: paymentData.userAgent || 'unknown'
    }
  });

  try {
    // Simulate payment gateway processing
    // In production: Replace with actual Stripe/PayPal integration
    const gatewayResult = await simulatePaymentGateway(amount, method);

    // Update payment status based on gateway result
    payment.status = gatewayResult.success ? 'completed' : 'failed';
    payment.gatewayResponse = gatewayResult;
    if (!gatewayResult.success) {
      payment.failureReason = gatewayResult.message;
    }
    await payment.save();

    paymentRequestsCounter.add(1, { status: payment.status, method });
    paymentDurationHistogram.record(Date.now() - startedAt, {
      status: payment.status,
      method
    });
    logger.info(`Payment ${payment.status} for order ${orderId}`);

    return payment;
  } catch (error) {
    // Mark payment as failed if gateway throws
    payment.status = 'failed';
    payment.failureReason = error.message;
    await payment.save();

    paymentRequestsCounter.add(1, { status: 'failed', method });
    paymentDurationHistogram.record(Date.now() - startedAt, {
      status: 'failed',
      method
    });
    logger.error(`Payment failed for order ${orderId}: ${error.message}`);

    throw new AppError(`Payment processing failed: ${error.message}`, 502);
  }
};

/**
 * Get the payment status for a specific order.
 * 
 * @param {string} orderId - Order MongoDB ObjectId
 * @returns {Promise<object>} Payment document
 * @throws {AppError} 404 if no payment found
 * 
 * Example response:
 * {
 *   "success": true,
 *   "message": "Payment status fetched",
 *   "data": {
 *     "orderId": "...",
 *     "status": "completed",
 *     "amount": 179.97,
 *     "transactionId": "txn_...",
 *     "method": "credit_card",
 *     "createdAt": "2024-07-15T14:30:00.000Z"
 *   }
 * }
 */
const getPaymentStatus = async (orderId) => {
  const payment = await Payment.findOne({ orderId })
    .sort({ createdAt: -1 }); // Get the most recent payment attempt

  if (!payment) {
    throw new AppError('No payment found for this order', 404);
  }

  return payment;
};

/**
 * Simulated payment gateway processor.
 * Replace this with actual Stripe/PayPal SDK in production.
 * 
 * Simulates a 90% success rate for testing purposes.
 * 
 * @param {number} amount - Payment amount
 * @param {string} method - Payment method
 * @returns {Promise<object>} Simulated gateway response
 */
const simulatePaymentGateway = async (amount, method) => {
  // Simulate processing delay (200-500ms)
  await new Promise(resolve =>
    setTimeout(resolve, Math.floor(Math.random() * 300) + 200)
  );

  // Keep the demo path reliable. Only fail for explicit edge-case scenarios.
  const isSuccess = method !== 'crypto' && amount < 200000;

  return {
    success: isSuccess,
    message: isSuccess
      ? 'Payment processed successfully'
      : 'Demo payment rule declined this transaction',
    gatewayId: `gw_${uuidv4().slice(0, 8)}`,
    processedAt: new Date().toISOString(),
    amount,
    method
  };
};

module.exports = {
  processPayment,
  getPaymentStatus
};
