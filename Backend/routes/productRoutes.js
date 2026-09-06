import express from 'express';
import { createProduct, deleteProduct, getAllProducts, getProductById, updateProduct } from '../controllers/productController.js';
import authMiddleware from '../middleware/auth.js';
import adminAuthMiddleware from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js';
import { validateCreateProduct } from '../middleware/validation.js';

const prouductrouter = express.Router();

// ROUTES
prouductrouter.get('/', getAllProducts);
prouductrouter.get('/:id', getProductById);

// Admin-only mutations
prouductrouter.post(
    '/',
    authMiddleware,
    adminAuthMiddleware,
    upload.single('image'),
    validateCreateProduct,
    createProduct
);
prouductrouter.put(
    '/:id',
    authMiddleware,
    adminAuthMiddleware,
    upload.single('image'),
    updateProduct
);
prouductrouter.delete('/:id', authMiddleware, adminAuthMiddleware, deleteProduct);

export default prouductrouter;