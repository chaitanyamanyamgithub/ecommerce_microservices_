/**
 * Cart Service Layer
 * 
 * Business logic for shopping cart operations.
 * Handles adding items, retrieving cart, and removing items.
 */

const Cart = require('../models/Cart');
const { AppError } = require('@shared/utils');
const { createServiceLogger } = require('@shared/logger');
const { metrics } = require('@opentelemetry/api');

const logger = createServiceLogger('cart-service');
const meter = metrics.getMeter('cart-service');
const cartRequestsCounter = meter.createCounter('cart_requests', {
  description: 'Cart operations performed by demo shoppers.'
});
const cartValueHistogram = meter.createHistogram('cart_value', {
  description: 'Cart totals after cart mutations.',
  unit: 'INR'
});

/**
 * Add an item to a user's cart.
 * If the product is already in the cart, increments the quantity.
 * If the user has no cart yet, creates one.
 * 
 * @param {object} itemData - { userId, productId, productName, price, quantity }
 * @returns {Promise<object>} Updated cart document
 * 
 * Example request body:
 * {
 *   "userId": "64a1b2c3d4e5f6789012abcd",
 *   "productId": "64b2c3d4e5f6789012abce",
 *   "productName": "Wireless Headphones",
 *   "price": 79.99,
 *   "quantity": 2
 * }
 * 
 * Example response:
 * {
 *   "success": true,
 *   "message": "Item added to cart",
 *   "data": {
 *     "_id": "...",
 *     "userId": "...",
 *     "items": [{ "productId": "...", "productName": "...", "price": 79.99, "quantity": 2 }],
 *     "totalAmount": 159.98
 *   }
 * }
 */
const addToCart = async (itemData) => {
  const { userId, productId, productName, price, quantity = 1 } = itemData;

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    // Create new cart for this user
    cart = new Cart({
      userId,
      items: [{ productId, productName, price, quantity }]
    });
  } else {
    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = price; // Update price in case it changed
    } else {
      // Add new item to cart
      cart.items.push({ productId, productName, price, quantity });
    }
  }

  await cart.save(); // Triggers totalAmount recalculation
  cartRequestsCounter.add(1, { operation: 'add' });
  cartValueHistogram.record(cart.totalAmount, { operation: 'add' });
  logger.info(`Added ${quantity} x ${productName} to cart for user ${userId}`);
  return cart;
};

/**
 * Get a user's cart.
 * 
 * @param {string} userId - MongoDB ObjectId of the user
 * @returns {Promise<object>} Cart document or empty cart object
 * 
 * Example response:
 * {
 *   "success": true,
 *   "message": "Cart fetched successfully",
 *   "data": {
 *     "userId": "...",
 *     "items": [...],
 *     "totalAmount": 239.97,
 *     "itemCount": 3
 *   }
 * }
 */
const getCartByUserId = async (userId) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    cartRequestsCounter.add(1, { operation: 'view', state: 'empty' });
    // Return an empty cart representation instead of 404
    return {
      userId,
      items: [],
      totalAmount: 0,
      itemCount: 0
    };
  }

  cartRequestsCounter.add(1, { operation: 'view', state: 'active' });

  return {
    ...cart.toJSON(),
    itemCount: cart.items.reduce((count, item) => count + item.quantity, 0)
  };
};

/**
 * Remove an item from a user's cart.
 * 
 * @param {string} userId - User's ObjectId
 * @param {string} productId - Product ObjectId to remove
 * @returns {Promise<object>} Updated cart document
 * @throws {AppError} 404 if cart or item not found
 * 
 * Example request body:
 * {
 *   "userId": "64a1b2c3d4e5f6789012abcd",
 *   "productId": "64b2c3d4e5f6789012abce"
 * }
 */
const removeFromCart = async (userId, productId) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    throw new AppError('Item not found in cart', 404);
  }

  // Remove the item from the array
  cart.items.splice(itemIndex, 1);
  await cart.save(); // Triggers totalAmount recalculation

  cartRequestsCounter.add(1, { operation: 'remove' });
  cartValueHistogram.record(cart.totalAmount, { operation: 'remove' });
  logger.info(`Removed product ${productId} from cart for user ${userId}`);

  return cart;
};

/**
 * Clear all items from a user's cart.
 *
 * @param {string} userId - User's ObjectId
 * @returns {Promise<object>} Empty cart
 */
const clearCart = async (userId) => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    cartRequestsCounter.add(1, { operation: 'clear', state: 'empty' });
    return { userId, items: [], totalAmount: 0 };
  }

  cart.items = [];
  await cart.save(); // Triggers totalAmount recalculation (will be 0)
  cartRequestsCounter.add(1, { operation: 'clear', state: 'cleared' });
  cartValueHistogram.record(cart.totalAmount, { operation: 'clear' });
  logger.info(`Cleared cart for user ${userId}`);
  return cart;
};

module.exports = {
  addToCart,
  getCartByUserId,
  removeFromCart,
  clearCart
};
