import cookieParser from 'cookie-parser'
import cors from 'cors'
import csrf from 'csurf'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import 'dotenv/config'
import { connectDB } from './config/db.js'
import { connectRedis } from './config/redis.js'

import path from 'path'
import { fileURLToPath } from 'url'

import { handleRazorpayWebhook } from './controllers/orderController.js'
import authMiddleware from './middleware/auth.js'
import addressRouter from './routes/addressRoutes.js'
import cartRouter from './routes/cartRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import productRouter from './routes/productRoutes.js'
import recommendationRouter from './routes/recommendationRoutes.js'
import userRouter from './routes/userRoutes.js'

// Validate required environment variables (skip strict checks during tests)
if (process.env.NODE_ENV !== 'test') {
    if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET environment variable is required');
        process.exit(1);
    }
    if (!process.env.MONGO_URI) {
        console.error('❌ MONGO_URI environment variable is required');
        process.exit(1);
    }
}

const app = express()

// Security Middleware
app.use(helmet()); // Set security HTTP headers
// Note: mongoSanitize removed due to compatibility issues with Express 5
// Use input validation middleware instead for protection

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(cookieParser());

// CSRF Protection (disabled for non-state-changing requests and specific routes)
// Using cookie-based CSRF since we're using cookie-parser
const csrfProtection = csrf({ cookie: true });

// Conditionally apply CSRF protection to state-changing routes
app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    // Skip CSRF for webhook routes
    if (req.path.startsWith('/webhooks/')) {
        return next();
    }
    // Skip CSRF for API routes that use JWT authentication
    // JWT tokens in headers are less vulnerable to CSRF attacks
    if (req.path.startsWith('/api/')) {
        return next();
    }
    csrfProtection(req, res, next);
});

// Provide CSRF token for frontend
app.get('/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
    message: 'Too many authentication attempts, please try again later.'
});

app.use(limiter);

// Only connect to DB when not under test
if (process.env.NODE_ENV !== 'test') {
    connectDB();
    connectRedis();
}

// ROUTES

//USER ROUTE
app.use('/api/users', authLimiter, userRouter)
app.use('/api/cart', authMiddleware, cartRouter);

//PRODUCT ROUTE
app.use('/uploads',express.static(path.join(__dirname, '/uploads')));
app.use('/api/products', productRouter)
app.use('/api/recommendations', recommendationRouter)
app.use('/api/orders', orderRouter) 
app.use("/api/address",addressRouter)

// Razorpay webhook endpoint (must use raw body for signature verification)
app.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);


// Health check routes
app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
});

app.get('/readyz', async (_req, res) => {
    try {
        const mongoose = await import('mongoose');
        if (mongoose.default.connection.readyState === 1) {
            res.json({ status: 'ready' });
        } else {
            res.status(503).json({ status: 'not ready' });
        }
    } catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
    }
});

//Server Console Message in Browser
app.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Quick E-Commaarce</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
              background: rgb(0, 0, 0);
            }
            h1 {
              color: #ffffff;
              margin-bottom: 20px;
            }
            h2 {
              color: #ffffff;
              margin-top: 50px;
              font-size: 30px;
            }
          </style>
        </head>
        <body>
          <h1>Your API is running👨‍💻, Go and Enjoy😊!</h1>
          <h2>DivineKart♨️</h2>
        </body>
      </html>
    `);
  });

// Centralized error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors
        });
    }
    
    // Mongoose duplicate key error
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `${field} already exists`
        });
    }
    
    // JSON parsing errors
    if (error.type === 'entity.parse.failed' || error instanceof SyntaxError) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON format in request body. Please check for syntax errors like trailing commas.',
            error: 'JSON parse error'
        });
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }
    
    // Default error
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal Server Error'
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT. Graceful shutdown...');
    const mongoose = await import('mongoose');
    await mongoose.default.connection.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
    const mongoose = await import('mongoose');
    await mongoose.default.connection.close();
    process.exit(0);
});

// LISTEN only when not testing
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server started on http://localhost:${port}`)
    })
}

export default app;