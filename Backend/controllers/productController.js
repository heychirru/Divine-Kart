import { Product } from "../models/productModel.js";


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

    const products = await Product.find()
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
        const filename = req.file?.filename ? req.file.filename : null;
        const uploadedImageUrl = filename ? `/uploads/${filename}` : null;
        const { name, description, OldPrice, price } = req.body;

        const categoryValue = req.body?.category ?? req.body?.Category ?? null;
        const imageUrl = uploadedImageUrl ?? req.body?.imageUrl ?? null;

        const parsedOldPrice = OldPrice !== undefined ? Number(OldPrice) : NaN;
        const parsedPrice = price !== undefined ? Number(price) : NaN;
        const __now = new Date();
        const __local = __now.toLocaleString();
        const __tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const __stamp = `${__local} ${__tz} | ${__now.toISOString()}`;
        console.log(`[createProduct @ ${__stamp}] Incoming:`, {
            body: req.body,
            file: req.file ? {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size
            } : null,
            derived: { categoryValue, imageUrl, parsedOldPrice, parsedPrice }
        });

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

        // Validate price constraints
        if (parsedPrice < 0 || parsedOldPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "Prices must be non-negative"
            });
        }

        if (parsedPrice > parsedOldPrice) {
            return res.status(400).json({
                success: false,
                message: "Price cannot be greater than old price"
            });
        }

        const createdProduct = await Product.create({
            name,
            description,
            category: categoryValue,
            OldPrice: parsedOldPrice,
            price: parsedPrice,
            imageUrl,
        });
        console.log(`[createProduct] Created:`, { id: createdProduct._id, createdAt: createdProduct.createdAt });
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

//DELETE FUNCTION TO DELETE A PRODUCT
export const deleteProduct = async (req, res, next) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if(deleted){
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