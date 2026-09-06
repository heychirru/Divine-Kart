import {
    getFrequentlyBoughtTogether,
    getPopularProducts,
    getRecommendations,
    getSimilarProducts
} from '../services/recommendationService.js';

/**
 * GET /api/recommendations
 * Get personalized recommendations for the authenticated user
 */
export const getUserRecommendations = async (req, res, next) => {
  try {
    const userId = req.user?._id || null;
    const limit = parseInt(req.query.limit) || 10;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 50'
      });
    }

    const recommendations = await getRecommendations(userId, limit);

    res.json({
      success: true,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/popular
 * Get popular products (no auth required)
 */
export const getPopular = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 50'
      });
    }

    const products = await getPopularProducts(limit);

    res.json({
      success: true,
      products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/similar/:productId
 * Get products similar to a specific product
 */
export const getSimilar = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (limit < 1 || limit > 20) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 20'
      });
    }

    const similar = await getSimilarProducts(productId, limit);

    res.json({
      success: true,
      products: similar,
      count: similar.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/frequently-bought-together/:productId
 * Get products frequently bought together with a specific product
 */
export const getFrequentlyBought = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (limit < 1 || limit > 20) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 20'
      });
    }

    const products = await getFrequentlyBoughtTogether(productId, limit);

    res.json({
      success: true,
      products,
      count: products.length
    });
  } catch (error) {
    next(error);
  }
};

