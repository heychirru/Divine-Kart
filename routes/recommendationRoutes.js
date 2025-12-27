import express from 'express';
import jwt from 'jsonwebtoken';
import {
    getFrequentlyBought,
    getPopular,
    getSimilar,
    getUserRecommendations
} from '../controllers/recommendationController.js';
import User from '../models/userModel.js';

const router = express.Router();

// Optional auth middleware - works with or without authentication
const optionalAuth = async (req, res, next) => {
  const token = 
    req.cookies?.token ||
    (req.headers?.authorization?.startsWith('Bearer ')
      ? req.headers?.authorization?.split(' ')[1]
      : null);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      req.user = null;
      return next();
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    req.user = user || null;
    req.userId = user?._id || null;
  } catch (error) {
    // Silently fail - continue without authentication
    req.user = null;
    req.userId = null;
  }
  next();
};

// Get personalized recommendations (works with or without auth)
router.get('/', optionalAuth, getUserRecommendations);

// Get popular products (no auth required)
router.get('/popular', getPopular);

// Get similar products (no auth required)
router.get('/similar/:productId', getSimilar);

// Get frequently bought together (no auth required)
router.get('/frequently-bought-together/:productId', getFrequentlyBought);

export default router;

