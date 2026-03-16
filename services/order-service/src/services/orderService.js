/**
 * Order Service Layer
 *
 * Orchestrates the full order workflow:
 * 1. Check product stock (product-service)
 * 2. Create the order
 * 3. Process payment (payment-service)
 * 4. Decrement stock (product-service)
 * 5. Clear the user's cart (cart-service)
 */

const axios = require('axios');
const { metrics, trace, SpanStatusCode } = require('@opentelemetry/api');
const { createServiceLogger } = require('@shared/logger');
const { AppError } = require('@shared/utils');
const Order = require('../models/Order');
const config = require('../config');

const { productService, cartService, paymentService } = config.services;
const logger = createServiceLogger('order-service');
const meter = metrics.getMeter('order-service');
const tracer = trace.getTracer('order-service');
const checkoutRequestsCounter = meter.createCounter('checkout_requests', {
  description: 'Checkout requests grouped by lifecycle status.'
});
const checkoutValueHistogram = meter.createHistogram('checkout_value', {
  description: 'Order totals processed by checkout.',
  unit: 'INR'
});
const checkoutDurationHistogram = meter.createHistogram('checkout_duration', {
  description: 'Time spent processing a checkout workflow.',
  unit: 'ms'
});

const withSpan = async (name, fn) =>
  tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      span.end();
    }
  });

/**
 * Create a new order with full orchestration.
 */
const createOrder = async (orderData) => {
  const startedAt = Date.now();
  const { items, userId, paymentMethod = 'upi' } = orderData;

  checkoutRequestsCounter.add(1, { status: 'started' });

  return withSpan('checkout.process_order', async () => {
    let order = null;
    let totalAmount = 0;

    try {
      logger.info(`Checkout started for user ${userId} with ${items.length} items`);

      const stockData = await withSpan('checkout.check_stock', async () => {
        try {
          const stockRes = await axios.post(`${productService}/api/products/check-stock`, { items });
          return stockRes.data.data;
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }

          throw new AppError(`Product service unavailable: ${error.message}`, 503);
        }
      });

      if (!stockData.available) {
        throw new AppError(
          `Insufficient stock for: ${stockData.insufficientItems.map((item) => item.productName || item.productId).join(', ')}`,
          400
        );
      }

      totalAmount = Math.round(
        items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100
      ) / 100;

      orderData.totalAmount = totalAmount;
      order = await Order.create(orderData);
      logger.info(`Created pending order ${order.orderNumber} for user ${userId}`);

      const paymentData = await withSpan('checkout.process_payment', async () => {
        try {
          const paymentRes = await axios.post(`${paymentService}/api/payment`, {
            orderId: order._id,
            userId,
            amount: totalAmount,
            currency: 'INR',
            method: paymentMethod
          });

          return paymentRes.data.data;
        } catch (error) {
          if (error.response && error.response.status === 402) {
            throw new AppError('Payment was declined', 402);
          }

          throw new AppError(`Payment service unavailable: ${error.message}`, 503);
        }
      });

      if (paymentData.status !== 'completed') {
        throw new AppError('Payment was declined', 402);
      }

      order.paymentStatus = 'completed';
      order.status = 'confirmed';
      await order.save();

      await withSpan('checkout.decrement_stock', async () => {
        try {
          await axios.post(`${productService}/api/products/decrement-stock`, { items });
          logger.info(`Stock decremented for order ${order.orderNumber}`);
        } catch (error) {
          logger.warn(`Stock decrement failed for order ${order.orderNumber}: ${error.message}`);
        }
      });

      await withSpan('checkout.clear_cart', async () => {
        try {
          await axios.delete(`${cartService}/api/cart/clear/${userId}`);
          logger.info(`Cart cleared for user ${userId} after order ${order.orderNumber}`);
        } catch (error) {
          logger.warn(`Cart clear failed for order ${order.orderNumber}: ${error.message}`);
        }
      });

      checkoutRequestsCounter.add(1, { status: 'confirmed' });
      checkoutValueHistogram.record(totalAmount, { status: 'confirmed' });
      checkoutDurationHistogram.record(Date.now() - startedAt, { status: 'confirmed' });
      logger.info(`Order ${order.orderNumber} confirmed for user ${userId}`);

      return order;
    } catch (error) {
      if (order) {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        await order.save().catch(() => {});
      }

      checkoutRequestsCounter.add(1, { status: 'failed' });
      if (totalAmount > 0) {
        checkoutValueHistogram.record(totalAmount, { status: 'failed' });
      }
      checkoutDurationHistogram.record(Date.now() - startedAt, { status: 'failed' });
      logger.error(`Checkout failed for user ${userId}: ${error.message}`);
      throw error;
    }
  });
};

/**
 * Get all orders for a specific user.
 */
const getOrdersByUserId = async (userId) => {
  const orders = await Order.find({ userId })
    .sort({ createdAt: -1 });

  return {
    orders,
    totalOrders: orders.length
  };
};

/**
 * Get a single order by its ID.
 */
const getOrderById = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return order;
};

module.exports = {
  createOrder,
  getOrdersByUserId,
  getOrderById
};
