import Order from '../models/orderModel.js';
import { Product } from '../models/productModel.js';

/**
 * Get personalized product recommendations for a user
 * Uses collaborative filtering and content-based filtering
 */
export const getRecommendations = async (userId, limit = 10) => {
  try {
    if (!userId) {
      // For non-logged-in users, return popular products
      return await getPopularProducts(limit);
    }

    // Get user's order history
    const userOrders = await Order.find({ user: userId })
      .populate('items.id')
      .lean();

    // If user has no orders, return popular products
    if (!userOrders || userOrders.length === 0) {
      return await getPopularProducts(limit);
    }

    // Extract purchased product IDs and categories
    const purchasedProductIds = new Set();
    const preferredCategories = new Map();

    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.id) {
          purchasedProductIds.add(item.id._id.toString());
          
          // Track category preferences with weights
          const category = item.id.category;
          if (category) {
            const currentWeight = preferredCategories.get(category) || 0;
            preferredCategories.set(category, currentWeight + item.quantity);
          }
        }
      });
    });

    // Get products from preferred categories (excluding already purchased)
    const categoryArray = Array.from(preferredCategories.keys());
    
    if (categoryArray.length === 0) {
      return await getPopularProducts(limit);
    }

    // Find similar products
    const recommendations = await Product.find({
      category: { $in: categoryArray },
      _id: { $nin: Array.from(purchasedProductIds) }
    })
      .limit(limit * 2) // Get more to filter
      .lean();

    // Rank by category preference weight
    const ranked = recommendations
      .map(product => ({
        ...product,
        score: preferredCategories.get(product.category) || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // If we don't have enough recommendations, fill with popular products
    if (ranked.length < limit) {
      const popular = await getPopularProducts(limit - ranked.length);
      ranked.push(...popular);
    }

    return ranked;
  } catch (error) {
    console.error('Recommendation error:', error);
    // Fallback to popular products on error
    return await getPopularProducts(limit);
  }
};

/**
 * Get products frequently bought together
 */
export const getFrequentlyBoughtTogether = async (productId, limit = 5) => {
  try {
    // Find orders containing this product
    const orders = await Order.find({
      'items.id': productId
    }).lean();

    if (orders.length === 0) {
      return await getPopularProducts(limit);
    }

    // Count co-occurrences
    const coOccurrences = new Map();

    orders.forEach(order => {
      order.items.forEach(item => {
        const itemId = item.id?.toString() || item.id;
        if (itemId && itemId !== productId.toString()) {
          const count = coOccurrences.get(itemId) || 0;
          coOccurrences.set(itemId, count + item.quantity);
        }
      });
    });

    // Get top co-occurring products
    const sortedIds = Array.from(coOccurrences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (sortedIds.length === 0) {
      return await getPopularProducts(limit);
    }

    const products = await Product.find({
      _id: { $in: sortedIds }
    }).lean();

    // Maintain order
    return sortedIds
      .map(id => products.find(p => p._id.toString() === id))
      .filter(Boolean);
  } catch (error) {
    console.error('Frequently bought together error:', error);
    return await getPopularProducts(limit);
  }
};

/**
 * Get popular products based on order frequency
 */
export const getPopularProducts = async (limit = 10) => {
  try {
    // Aggregate to find most ordered products
    const popularProductIds = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.id',
          count: { $sum: '$items.quantity' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    const ids = popularProductIds.map(item => item._id).filter(Boolean);

    if (ids.length === 0) {
      // Fallback: return newest products
      return await Product.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    const products = await Product.find({ _id: { $in: ids } }).lean();

    // Maintain popularity order
    return ids
      .map(id => products.find(p => p._id.toString() === id.toString()))
      .filter(Boolean);
  } catch (error) {
    console.error('Popular products error:', error);
    // Final fallback
    return await Product.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
};

/**
 * Get recommendations based on product similarity (content-based)
 */
export const getSimilarProducts = async (productId, limit = 5) => {
  try {
    const product = await Product.findById(productId).lean();
    
    if (!product) {
      return [];
    }

    // Find products in same category with similar price range
    const priceRange = product.price * 0.3; // ±30% price range
    
    const similar = await Product.find({
      category: product.category,
      price: {
        $gte: product.price - priceRange,
        $lte: product.price + priceRange
      },
      _id: { $ne: productId }
    })
      .limit(limit)
      .lean();

    return similar;
  } catch (error) {
    console.error('Similar products error:', error);
    return [];
  }
};

