import Cart from "../models/cartModel.js";
import createError from 'http-errors';

export const getCart = async (req, res, next) => {
    try {
        const items = await Cart.find({ user: req.user._id }).populate({
            path: 'product',
            model: 'Product'
        });
        const formatted = items.map(ci => ({
            _id: ci._id.toString(),
            product: ci.product,
            quantity: ci.quantity
        }))
        res.json(formatted);
    }
    catch (error) {
        next(error);
    }
}

export const addToCart = async (req, res, next) => {
    try {
        const { productId, itemId, quantity = 1 } = req.body;
        const pid = productId || itemId;

        if (!pid) {
            throw createError(400, 'Product ID is required');
        }

        if (typeof quantity !== 'number' || quantity < 1) {
            throw createError(400, 'Quantity must be a positive number');
        }

        const cartItem = await Cart.findOneAndUpdate(
            { user: req.user._id, product: pid },
            { $inc: { quantity: quantity } },
            { 
                upsert: true, 
                new: true,
                runValidators: true
            }
        ).populate('product');

        res.status(201).json({
            _id: cartItem._id.toString(),
            product: cartItem.product,
            quantity: cartItem.quantity
        });
        
    }
    catch (error) {
        next(error);
    }
}

export const updateCartItem = async (req, res, next) => {
   try {
        const { quantity } = req.body;
        const cartItem = await Cart.findOne({ _id: req.params.id, user: req.user._id });

        if (!cartItem) {
            throw createError(404, 'Item not found in Cart');
        }
        
        if (typeof quantity !== 'number' || quantity < 1) {
            throw createError(400, 'Quantity must be a positive number');
        }
        
        cartItem.quantity = quantity;
        await cartItem.save();
        await cartItem.populate('product');
        
        res.json({
            _id: cartItem._id.toString(),
            product: cartItem.product,
            quantity: cartItem.quantity
        })
    }
    catch (error) {
        next(error);
   }
}

export const deletecartItem = async (req, res, next) => {
    try {
        const cartItem = await Cart.findOne({ _id: req.params.id, user: req.user._id });

        if (!cartItem) {
            throw createError(404, 'Cart item not found');
        }
        await cartItem.deleteOne();
        res.json({ message: 'Item Removed from cart', _id: req.params.id });
    } 
    catch (error) {
        next(error);
    }
}

export const clearCart = async (req, res, next) => {
    try {
        await Cart.deleteMany({ user: req.user._id });
        res.json({ message: 'Cart Cleared' });
    } 
    catch (error) {
        next(error);
    }
}