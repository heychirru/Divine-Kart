import express from 'express';
import jwt from 'jsonwebtoken';
import { chat } from '../controllers/chatController.js';
import { smartSearch } from '../controllers/searchController.js';
import { generateDescription } from '../controllers/aiProductController.js';
import adminAuthMiddleware from '../middleware/adminAuth.js';
import User from '../models/userModel.js';

const router = express.Router();

// ─── Optional Auth (passes user if logged in, continues as guest if not) ──────
const optionalAuth = async (req, res, next) => {
  const token =
    req.cookies?.token ||
    (req.headers?.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
};

// ─── Required Auth ─────────────────────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  const token =
    req.cookies?.token ||
    (req.headers?.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token missing' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ success: false, message });
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/ai/chat — AI shopping assistant (works for guests and logged-in users)
router.post('/chat', optionalAuth, chat);

// GET /api/ai/search?q=... — AI natural language product search (public)
router.get('/search', smartSearch);

// POST /api/ai/generate-description — Generate product description (Admin only)
router.post('/generate-description', requireAuth, adminAuthMiddleware, generateDescription);

export default router;
