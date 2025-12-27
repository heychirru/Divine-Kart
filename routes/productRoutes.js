import express from 'express';
import multer from 'multer';
import { getAllProducts, createProduct, deleteProduct } from '../controllers/productController.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import authMiddleware from '../middleware/auth.js';
import adminAuthMiddleware from '../middleware/adminAuth.js';
import { validateCreateProduct } from '../middleware/validation.js';

const prouductrouter = express.Router();

//MULTER CONFIGURATION with security enhancements
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) => {
        // Generate random filename to prevent conflicts and security issues
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    // Only allow image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'), false);
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only one file per request
    }
});

//ROUTES
prouductrouter.get('/', getAllProducts);
prouductrouter.post('/', authMiddleware, adminAuthMiddleware, validateCreateProduct, upload.single('image'), createProduct);
prouductrouter.delete('/:id', authMiddleware, adminAuthMiddleware, deleteProduct);

export default prouductrouter;