import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    imageUrl: { type: String }
});

const orderSchema = new mongoose.Schema({
    orderId: { 
        type: String, 
        unique: true, 
        required: true 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    customer: {
        name: { type: String, required: true },
        email: { type: String, default: '' },
        phone: { type: String, required: true, minlength: 10 },
        address: { type: String, required: true },
        notes: { type: String }
    },
    paymentMethod: { 
        type: String, 
        enum: ['Cash on Delivery', 'Online Payment'], 
        required: true 
    },
    items: { 
        type: [orderItemSchema], 
        default: [] 
    },
    subtotal: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    tax: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    deliveryFee: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    totalAmount: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    // Razorpay fields
    razorpayOrderId: { 
        type: String 
    },
    razorpayPaymentId: { 
        type: String 
    },
    razorpaySignature: { 
        type: String 
    },
    paymentStatus: { 
        type: String, 
        enum: ['Unpaid', 'Paid'], 
        default: 'Unpaid' 
    },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], 
        default: 'pending'
    },
    createdAt: { 
        type: Date, 
        default: Date.now, 
        index: true 
    },
    deliveryDate: { 
        type: Date, 
        index: true 
    },
    store: {
        type: mongoose.Schema.ObjectId,
        ref: 'Store',
        index: true
    },
    routingMethod: {
        type: String,
        enum: ['Proximity', 'Pincode', 'Manual'],
        default: 'Proximity'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add indexes for performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1 });

import { PRICING_CONFIG } from '../config/pricing.js';

// Server pricing logic - pre-save hook
orderSchema.pre('save', function(next) {
    // Validate items array exists and is not empty
    if (!this.items || !Array.isArray(this.items) || this.items.length === 0) {
        return next(new Error('Order must have at least one item'));
    }
    
    this.subtotal = this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    this.tax = parseFloat((this.subtotal * PRICING_CONFIG.TAX_RATE).toFixed(2));
    this.totalAmount = this.subtotal + this.tax + (this.deliveryFee || PRICING_CONFIG.DEFAULT_SHIPPING);
    
    // Validate total is positive
    if (this.totalAmount <= 0) {
        return next(new Error('Order total must be greater than zero'));
    }
    
    next();
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;