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
        email: { type: String, required: true},
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
    shipping: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    total: { 
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
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], 
        default: 'Pending' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now, 
        index: true 
    },
    deliveryDate: { 
        type: Date, 
        index: true 
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add indexes for performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1 });

// Server pricing logic - pre-save hook
orderSchema.pre('save', function(next) {
    // Validate items array exists and is not empty
    if (!this.items || !Array.isArray(this.items) || this.items.length === 0) {
        return next(new Error('Order must have at least one item'));
    }
    
    this.subtotal = this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    this.tax = parseFloat((this.subtotal * 0.07).toFixed(2));
    this.total = this.subtotal + this.tax + (this.shipping || 0);
    
    // Validate total is positive
    if (this.total <= 0) {
        return next(new Error('Order total must be greater than zero'));
    }
    
    next();
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;