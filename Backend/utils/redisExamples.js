// EXAMPLE: How to use Redis caching in your controllers

import { Product } from "../models/productModel.js";
import { cacheData, getCachedData, deleteCachedData } from "../utils/redisCache.js";

/**
 * Example: Get all products with Redis caching
 * Cache is stored for 1 hour (3600 seconds)
 */
export const getAllProductsWithCache = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const cacheKey = `products:page:${page}:limit:${limit}`;

    // Check if data exists in cache
    const cachedProducts = await getCachedData(cacheKey);
    if (cachedProducts) {
      console.log('📦 Products retrieved from cache');
      return res.json({
        success: true,
        products: cachedProducts.products,
        pagination: cachedProducts.pagination,
        fromCache: true
      });
    }

    const skip = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters'
      });
    }

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const responseData = {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    // Cache the response for 1 hour
    await cacheData(cacheKey, responseData, 3600);
    console.log('💾 Products cached');

    res.json({
      success: true,
      ...responseData,
      fromCache: false
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Example: Get single product by ID with caching
 */
export const getProductByIdWithCache = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:${id}`;

    // Check cache first
    const cachedProduct = await getCachedData(cacheKey);
    if (cachedProduct) {
      console.log('📦 Product retrieved from cache');
      return res.json({
        success: true,
        product: cachedProduct,
        fromCache: true
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Cache for 30 minutes
    await cacheData(cacheKey, product.toObject(), 1800);
    console.log('💾 Product cached');

    res.json({
      success: true,
      product,
      fromCache: false
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Example: Invalidate cache when product is updated
 */
export const updateProductWithCacheInvalidation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Invalidate cache for this product
    const cacheKey = `product:${id}`;
    await deleteCachedData(cacheKey);
    console.log('🗑️ Product cache invalidated');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    next(error);
  }
};
