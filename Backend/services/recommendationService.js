import Order from '../models/orderModel.js';
import { Product } from '../models/productModel.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Cache Helpers (no-op — Redis removed) ───────────────────────────────────
// eslint-disable-next-line no-unused-vars
const getCache = async (_key) => null;
// eslint-disable-next-line no-unused-vars
const setCache = async (_key, _value, _ttl) => {};

// ─── AI-Powered Similar Products ─────────────────────────────────────────────

/**
 * Get products similar to a given product using Gemini AI.
 * Falls back to category + price range if AI fails.
 */
export const getSimilarProducts = async (productId, limit = 5) => {
  const cacheKey = `similar:${productId}`;

  try {
    // 1. Check Redis cache first
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // 2. Fetch the target product
    const product = await Product.findById(productId).lean();
    if (!product) return [];

    // 3. Get candidate products from the same category
    const candidates = await Product.find({
      category: product.category,
      _id: { $ne: productId },
    })
      .limit(20)
      .lean();

    if (candidates.length === 0) return [];

    // 4. Ask Gemini to rank candidates by semantic similarity
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are a product similarity engine for an e-commerce store.

Target product:
- Name: ${product.name}
- Description: ${product.description || 'N/A'}
- Price: ${product.price}

Candidate products:
${JSON.stringify(
  candidates.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    description: p.description || '',
    price: p.price,
  })),
  null,
  2
)}

Task: Return ONLY a raw JSON array of the top ${limit} most similar product IDs 
ordered by similarity score (most similar first).
Do NOT include markdown, explanation, or extra text.
Example output: ["id1", "id2", "id3"]
    `.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // 5. Safely parse the AI response
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const rankedIds = JSON.parse(cleanJson);

    // 6. Map IDs back to product objects maintaining ranked order
    const ranked = rankedIds
      .map((id) => candidates.find((p) => p._id.toString() === id.toString()))
      .filter(Boolean)
      .slice(0, limit);

    // 7. Cache result for 1 hour
    await setCache(cacheKey, ranked, 3600);

    return ranked;
  } catch (error) {
    console.error('getSimilarProducts (AI) error:', error.message);

    // ── Fallback: category + price range ──
    try {
      const product = await Product.findById(productId).lean();
      if (!product) return [];
      const priceRange = product.price * 0.3;
      return await Product.find({
        category: product.category,
        price: {
          $gte: product.price - priceRange,
          $lte: product.price + priceRange,
        },
        _id: { $ne: productId },
      })
        .limit(limit)
        .lean();
    } catch (fallbackError) {
      console.error('getSimilarProducts (fallback) error:', fallbackError.message);
      return [];
    }
  }
};

// ─── Personalized Recommendations ────────────────────────────────────────────

/**
 * Get personalized product recommendations for a user.
 * Uses collaborative filtering based on order history.
 * Falls back to popular products for new/guest users.
 */
export const getRecommendations = async (userId, limit = 10) => {
  const cacheKey = `recommendations:${userId}`;

  try {
    // 1. Guest users → popular products
    if (!userId) return await getPopularProducts(limit);

    // 2. Check cache
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // 3. Fetch order history
    const userOrders = await Order.find({ user: userId })
      .populate('items.id')
      .lean();

    if (!userOrders || userOrders.length === 0) {
      return await getPopularProducts(limit);
    }

    // 4. Extract purchased product IDs and category preferences (weighted)
    const purchasedProductIds = new Set();
    const preferredCategories = new Map();

    userOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.id) {
          purchasedProductIds.add(item.id._id.toString());
          const category = item.id.category;
          if (category) {
            const current = preferredCategories.get(category) || 0;
            preferredCategories.set(category, current + item.quantity);
          }
        }
      });
    });

    const categoryArray = Array.from(preferredCategories.keys());
    if (categoryArray.length === 0) return await getPopularProducts(limit);

    // 5. Fetch unseen products from preferred categories
    const recommendations = await Product.find({
      category: { $in: categoryArray },
      _id: { $nin: Array.from(purchasedProductIds) },
    })
      .limit(limit * 2)
      .lean();

    // 6. Rank by category preference weight
    const ranked = recommendations
      .map((product) => ({
        ...product,
        score: preferredCategories.get(product.category) || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // 7. Pad with popular products if not enough results
    if (ranked.length < limit) {
      const popular = await getPopularProducts(limit - ranked.length);
      ranked.push(...popular);
    }

    // 8. Cache for 30 minutes (user-specific, changes more often)
    await setCache(cacheKey, ranked, 1800);

    return ranked;
  } catch (error) {
    console.error('getRecommendations error:', error.message);
    return await getPopularProducts(limit);
  }
};

// ─── Frequently Bought Together ───────────────────────────────────────────────

/**
 * Get products frequently ordered alongside a given product.
 */
export const getFrequentlyBoughtTogether = async (productId, limit = 5) => {
  const cacheKey = `fbt:${productId}`;

  try {
    // 1. Check cache
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // 2. Find orders containing this product
    const orders = await Order.find({ 'items.id': productId }).lean();
    if (orders.length === 0) return await getPopularProducts(limit);

    // 3. Count co-occurrences with other products
    const coOccurrences = new Map();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const itemId = item.id?.toString() || item.id;
        if (itemId && itemId !== productId.toString()) {
          const count = coOccurrences.get(itemId) || 0;
          coOccurrences.set(itemId, count + item.quantity);
        }
      });
    });

    // 4. Sort by frequency and take top IDs
    const sortedIds = Array.from(coOccurrences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (sortedIds.length === 0) return await getPopularProducts(limit);

    // 5. Fetch product details
    const products = await Product.find({ _id: { $in: sortedIds } }).lean();

    const result = sortedIds
      .map((id) => products.find((p) => p._id.toString() === id))
      .filter(Boolean);

    // 6. Cache for 2 hours
    await setCache(cacheKey, result, 7200);

    return result;
  } catch (error) {
    console.error('getFrequentlyBoughtTogether error:', error.message);
    return await getPopularProducts(limit);
  }
};

// ─── Popular Products ─────────────────────────────────────────────────────────

/**
 * Get globally popular products based on total units ordered.
 * Falls back to newest products if no order data exists.
 */
export const getPopularProducts = async (limit = 10) => {
  const cacheKey = `popular:${limit}`;

  try {
    // 1. Check cache
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // 2. Aggregate most-ordered product IDs
    const popularProductIds = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.id',
          count: { $sum: '$items.quantity' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const ids = popularProductIds.map((item) => item._id).filter(Boolean);

    // 3. Fallback: newest products if no orders exist
    if (ids.length === 0) {
      const newest = await Product.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      await setCache(cacheKey, newest, 3600);
      return newest;
    }

    // 4. Fetch and reorder by popularity
    const products = await Product.find({ _id: { $in: ids } }).lean();
    const result = ids
      .map((id) => products.find((p) => p._id.toString() === id.toString()))
      .filter(Boolean);

    // 5. Cache for 1 hour
    await setCache(cacheKey, result, 3600);

    return result;
  } catch (error) {
    console.error('getPopularProducts error:', error.message);
    return await Product.find().sort({ createdAt: -1 }).limit(limit).lean();
  }
};