import { aiSearch } from '../services/chatService.js';

/**
 * GET /api/ai/search?q=red+running+shoes
 * AI Smart Search - converts natural language queries into filtered product results.
 */
export const smartSearch = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required.',
      });
    }

    if (q.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Query must be 200 characters or less.',
      });
    }

    const { products, filters } = await aiSearch(q.trim());

    res.json({
      success: true,
      query: q.trim(),
      filters,
      products,
      count: products.length,
    });
  } catch (error) {
    next(error);
  }
};
