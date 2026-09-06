import { Product } from "../models/productModel.js";
import uploadImageClodinary from "../utils/uploadImageClodinary.js";

//GET SINGLE PRODUCT BY ID
export const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
}

//GET FUNCTION TO GET ALL PRODUCTS
export const getAllProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pagination parameters'
            });
        }

        const query = {};
        if (req.query.store) query.store = req.query.store;
        if (req.query.category) query.category = req.query.category;

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Product.countDocuments();
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            products,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        next(error);
    }
}

//CREATE FUNCTION TO CREATE A PRODUCT
export const createProduct = async (req, res, next) => {
    try {
        const { name, description, OldPrice, price } = req.body;
        const stock = req.body.stock !== undefined ? Number(req.body.stock) : 0;

        const categoryValue = req.body?.category ?? req.body?.Category ?? null;

        // Prefer uploaded file -> ImageKit; fall back to direct imageUrl in body
        let imageUrl = req.body?.imageUrl ?? null;

        if (req.file) {
            try {
                const uploadResult = await uploadImageClodinary(req.file);
                imageUrl = uploadResult?.url || uploadResult?.secure_url || imageUrl;
            } catch (uploadError) {
                console.error("[createProduct] ImageKit upload error:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload product image",
                });
            }
        }

        const parsedOldPrice = OldPrice !== undefined ? Number(OldPrice) : NaN;
        const parsedPrice = price !== undefined ? Number(price) : NaN;
        
        if (!name || !categoryValue || imageUrl === null) {
            return res.status(400).json({
                message: "Missing required fields",
                details: {
                    name: !name ? "name is required" : undefined,
                    category: !categoryValue ? "category is required" : undefined,
                    imageUrl: imageUrl === null ? "imageUrl is required (file upload or body.imageUrl)" : undefined,
                }
            });
        }

        if (Number.isNaN(parsedOldPrice) || Number.isNaN(parsedPrice)) {
            return res.status(400).json({
                success: false,
                message: "Invalid numeric fields",
                details: {
                    OldPrice: Number.isNaN(parsedOldPrice) ? "OldPrice must be a number" : undefined,
                    price: Number.isNaN(parsedPrice) ? "price must be a number" : undefined,
                }
            });
        }

        if (parsedPrice < 0 || parsedOldPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "Prices must be non-negative"
            });
        }

        const createdProduct = await Product.create({
            name,
            description,
            category: categoryValue,
            OldPrice: parsedOldPrice,
            price: parsedPrice,
            imageUrl,
            stock: isNaN(stock) ? 0 : stock,
        });
        
        res.status(201).json({
            success: true,
            product: createdProduct
        });
    }
    catch (error) {
        console.log(`[createProduct] Error:`, error);
        next(error);
    }
}

//UPDATE FUNCTION TO UPDATE A PRODUCT
export const updateProduct = async (req, res, next) => {
    try {
        const { name, description, category, OldPrice, price, imageUrl } = req.body;
        const stock = req.body.stock !== undefined ? Number(req.body.stock) : undefined;

        // Handle optional new image upload
        let updatedImageUrl = imageUrl;
        if (req.file) {
            try {
                const uploadResult = await uploadImageClodinary(req.file);
                updatedImageUrl = uploadResult?.url || uploadResult?.secure_url || imageUrl;
            } catch (uploadError) {
                return res.status(500).json({ success: false, message: 'Failed to upload image' });
            }
        }

        const parsedOldPrice = OldPrice !== undefined ? Number(OldPrice) : undefined;
        const parsedPrice = price !== undefined ? Number(price) : undefined;

        if (parsedPrice !== undefined && parsedOldPrice !== undefined && parsedPrice > parsedOldPrice) {
            return res.status(400).json({ success: false, message: 'Price cannot be greater than OldPrice' });
        }

        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(category && { category }),
                ...(parsedOldPrice !== undefined && { OldPrice: parsedOldPrice }),
                ...(parsedPrice !== undefined && { price: parsedPrice }),
                ...(updatedImageUrl && { imageUrl: updatedImageUrl }),
                ...(stock !== undefined && !isNaN(stock) && { stock }),
            },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, product: updated });
    } catch (error) {
        next(error);
    }
}
export const deleteProduct = async (req, res, next) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (deleted) {
            res.status(200).json({
                success: true,
                message: "Product deleted successfully"
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }
    } catch (error) {
        next(error);
    }
}