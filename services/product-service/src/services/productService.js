/**
 * Product Service Layer
 * 
 * Business logic for product CRUD operations.
 * Supports pagination, filtering by category, and text search.
 */

const Product = require('../models/Product');
const { AppError } = require('@shared/utils');
const { createServiceLogger } = require('@shared/logger');
const { metrics } = require('@opentelemetry/api');

const logger = createServiceLogger('product-service');
const meter = metrics.getMeter('product-service');
const catalogRequestsCounter = meter.createCounter('catalog_requests', {
  description: 'Catalog and product detail requests handled by the product service.'
});
const stockOperationsCounter = meter.createCounter('stock_operations', {
  description: 'Inventory checks and stock decrements performed during checkout.'
});

/**
 * Get all products with optional filtering and pagination.
 * 
 * @param {object} query - Query parameters
 * @param {string} query.category - Filter by category
 * @param {string} query.search - Text search in name/description
 * @param {number} query.page - Page number (default: 1)
 * @param {number} query.limit - Items per page (default: 10)
 * @param {string} query.sort - Sort field (default: '-createdAt')
 * @returns {Promise<{ products: Array, pagination: object }>}
 * 
 * Example response:
 * {
 *   "products": [...],
 *   "pagination": { "total": 50, "page": 1, "pages": 5, "limit": 10 }
 * }
 */
const getAllProducts = async (query) => {
  const {
    category,
    search,
    page = 1,
    limit = 10,
    sort = '-createdAt',
    minPrice,
    maxPrice
  } = query;

  // Build filter object
  const filter = { isActive: true };

  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter)
  ]);

  catalogRequestsCounter.add(1, { route: 'list' });
  logger.info(`Catalog returned ${products.length} products for browsing`);

  return {
    products,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit)
    }
  };
};

/**
 * Get a single product by ID.
 * 
 * @param {string} productId - MongoDB ObjectId
 * @returns {Promise<object>} Product document
 * @throws {AppError} 404 if product not found
 */
const getProductById = async (productId) => {
  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    throw new AppError('Product not found', 404);
  }

  catalogRequestsCounter.add(1, { route: 'detail' });

  return product;
};

/**
 * Create a new product.
 * 
 * @param {object} productData - Product fields
 * @returns {Promise<object>} Created product document
 * 
 * Example request body:
 * {
 *   "name": "Wireless Bluetooth Headphones",
 *   "description": "Premium noise-cancelling headphones with 30hr battery",
 *   "price": 79.99,
 *   "category": "electronics",
 *   "brand": "AudioMax",
 *   "stock": 150,
 *   "images": [{ "url": "https://example.com/headphones.jpg", "alt": "Headphones" }],
 *   "tags": ["wireless", "bluetooth", "noise-cancelling"]
 * }
 */
const createProduct = async (productData) => {
  const product = await Product.create(productData);
  logger.info(`Created product ${product.name} with SKU ${product.sku || 'n/a'}`);
  return product;
};

/**
 * Delete (soft-delete) a product by ID.
 * Sets isActive to false rather than removing the document.
 * 
 * @param {string} productId - MongoDB ObjectId
 * @returns {Promise<object>} Updated product document
 * @throws {AppError} 404 if product not found
 */
const deleteProduct = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  product.isActive = false;
  await product.save();

  return product;
};

/**
 * Check if all requested items have sufficient stock.
 *
 * @param {Array<{ productId: string, quantity: number }>} items
 * @returns {Promise<{ available: boolean, insufficientItems: Array }>}
 */
const checkStock = async (items) => {
  const insufficientItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      insufficientItems.push({
        productId: item.productId,
        requested: item.quantity,
        available: 0,
        reason: 'Product not found'
      });
    } else if (product.stock < item.quantity) {
      insufficientItems.push({
        productId: item.productId,
        productName: product.name,
        requested: item.quantity,
        available: product.stock,
        reason: 'Insufficient stock'
      });
    }
  }

  stockOperationsCounter.add(1, {
    operation: 'check',
    result: insufficientItems.length === 0 ? 'available' : 'insufficient'
  });

  return {
    available: insufficientItems.length === 0,
    insufficientItems
  };
};

/**
 * Decrement stock for a list of purchased items.
 *
 * @param {Array<{ productId: string, quantity: number }>} items
 * @returns {Promise<void>}
 */
const decrementStock = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
      await product.save();
    }
  }

  stockOperationsCounter.add(1, { operation: 'decrement' });
  logger.info(`Decremented stock for ${items.length} ordered line items`);
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  deleteProduct,
  checkStock,
  decrementStock
};
