import crypto from 'crypto';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';
import Order from '../models/orderModel.js';
import { Product } from '../models/productModel.js';

// Lazy initialization of Razorpay to avoid errors if env vars are missing
let razorpay = null;
const getRazorpayInstance = () => {
    if (!razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return razorpay;
};

//CREATE ORDER
export const createOrder = async (req, res, next) => {
    try {
        // Validate user is authenticated
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const { customer, paymentMethod, items, notes, shipping = 0 } = req.body;
        
        // Validate customer object
        if (!customer || typeof customer !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Customer information is required'
            });
        }

        if (!customer.name || !customer.email || !customer.phone || !customer.address) {
            return res.status(400).json({
                success: false,
                message: 'Customer name, email, phone, and address are required'
            });
        }

        // Validate payment method
        if (!paymentMethod || !['COD', 'Online Payment'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method. Must be either "COD" or "Online Payment"'
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items must be an array with at least one item'
            });
        }

        // Validate all items have id
        const itemsWithMissingId = items.filter(item => !item || !item.id);
        if (itemsWithMissingId.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'All items must have a valid product ID'
            });
        }

        // Check for duplicate product IDs
        const productIds = items.map(item => item.id);
        const uniqueProductIds = [...new Set(productIds)];
        if (productIds.length !== uniqueProductIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate product IDs found in items. Each product should appear only once.'
            });
        }

        // Validate and fetch products with server-side pricing
        const products = await Product.find({ _id: { $in: productIds } });
        
        if (products.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more products not found'
            });
        }

        // Create order items with server-side pricing
        const orderItems = items.map(clientItem => {
            const serverProduct = products.find(p => p._id.toString() === clientItem.id);
            if (!serverProduct) {
                throw new Error(`Product with id ${clientItem.id} not found`);
            }
            return {
                id: serverProduct._id.toString(),
                name: serverProduct.name,
                price: serverProduct.price,
                quantity: Number(clientItem.quantity),
                imageUrl: serverProduct.imageUrl
            };
        });

        // Calculate pricing (used for both payment methods)
        const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const tax = parseFloat((subtotal * 0.07).toFixed(2));
        const total = subtotal + tax + shipping;

        // Validate total is positive
        if (total <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Order total must be greater than zero'
            });
        }

        const normalizedPM = paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment';
        const orderId = `ORD-${uuidv4()}`;
        let newOrder;

        if (normalizedPM === 'Online Payment') {
            // Validate Razorpay credentials
            if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                return res.status(500).json({
                    success: false,
                    message: 'Payment gateway not configured. Please contact support.'
                });
            }

            const razorpayInstance = getRazorpayInstance();
            if (!razorpayInstance) {
                return res.status(500).json({
                    success: false,
                    message: 'Payment gateway initialization failed. Please contact support.'
                });
            }

            try {
                const rpOrder = await razorpayInstance.orders.create({
                    amount: Math.round(total * 100), // in paise
                    currency: 'INR',
                    receipt: orderId,
                    notes: { orderId, customerEmail: customer.email }
                });

                newOrder = new Order({
                    orderId,
                    user: req.user._id,
                    customer,
                    items: orderItems,
                    shipping,
                    subtotal,
                    tax,
                    total,
                    paymentMethod: normalizedPM,
                    paymentStatus: 'Unpaid',
                    razorpayOrderId: rpOrder.id,
                    notes
                });

                await newOrder.save();
                return res.status(201).json({
                    success: true,
                    order: newOrder,
                    razorpay: {
                        key: process.env.RAZORPAY_KEY_ID,
                        amount: rpOrder.amount,
                        currency: rpOrder.currency,
                        order_id: rpOrder.id,
                        name: 'Order Payment',
                        description: `Payment for ${orderId}`,
                        prefill: { name: customer.name, email: customer.email, contact: customer.phone },
                        notes: { orderId }
                    }
                });
            } catch (razorpayError) {
                console.error('Razorpay Error:', razorpayError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create payment order. Please try again.',
                    error: process.env.NODE_ENV === 'development' ? razorpayError.message : undefined
                });
            }
        }

        // COD ORDER
        newOrder = new Order({
            orderId,
            user: req.user._id,
            customer,
            items: orderItems,
            shipping,
            subtotal,
            tax,
            total,
            paymentMethod: normalizedPM,
            paymentStatus: 'Paid',
            notes
        });
        
        await newOrder.save();
        res.status(201).json({ 
            success: true,
            order: newOrder, 
            checkoutUrl: null 
        });

    } catch (error) {
        console.error('CreateOrder Error:', error);
        next(error);
    }
}

// VERIFY RAZORPAY PAYMENT
export const verifyRazorpayPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing payment verification fields' 
            });
        }

        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Payment verification not configured'
            });
        }

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid payment signature' 
            });
        }

        // Check if order exists and is not already paid (race condition prevention)
        const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (!existingOrder) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        if (existingOrder.paymentStatus === 'Paid') {
            return res.status(400).json({
                success: false,
                message: 'Payment already verified for this order',
                order: existingOrder
            });
        }

        const order = await Order.findOneAndUpdate(
            { 
                razorpayOrderId: razorpay_order_id,
                paymentStatus: { $ne: 'Paid' } // Only update if not already paid
            },
            { 
                paymentStatus: 'Paid',
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature
            },
            { new: true }
        );

        if (!order) {
            return res.status(400).json({ 
                success: false,
                message: 'Order payment status could not be updated. It may already be paid.' 
            });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('VerifyPayment Error:', error);
        next(error);
    }
}

//GET ALL ORDERS
export const getOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pagination parameters'
            });
        }

        const query = {};
        
        // If user is not admin, only show their orders
        if (req.user && req.user.role !== 'admin') {
            query.user = req.user._id;
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Order.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            orders,
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
        console.error('GetOrders Error:', error);
        next(error);
    }
}

//GET ORDERS BY ID
export const getOrderById = async (req, res, next) => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Order.findById(req.params.id).lean();
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        // If user is not admin, only allow access to their own orders
        if (req.user && req.user.role !== 'admin') {
            if (!order.user) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
            if (order.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('GetOrderById Error:', error);
        next(error);
    }
}

//UPDATE ORDER BY ID
export const updateOrder = async (req, res, next) => {  
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        // If user is not admin, only allow access to their own orders
        if (req.user && req.user.role !== 'admin') {
            if (!order.user) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
            if (order.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        const allowed = ['status', 'paymentStatus', 'deliveryDate', 'notes', 'shipping'];
        const updateData = {};
        
        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // If shipping is updated, recalculate total
        if (updateData.shipping !== undefined) {
            if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update shipping: order has no items'
                });
            }
            const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
            const tax = parseFloat((subtotal * 0.07).toFixed(2));
            const newTotal = subtotal + tax + updateData.shipping;
            
            if (newTotal <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Updated order total must be greater than zero'
                });
            }
            
            updateData.subtotal = subtotal;
            updateData.tax = tax;
            updateData.total = newTotal;
        }

        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error('UpdateOrder Error:', error);
        next(error);
    }
}

//DELETE ORDER BY ID
export const deleteOrder = async (req, res, next) => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        // Only admins can delete orders
        if (req.user && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ 
            success: true,
            message: 'Order deleted successfully' 
        });
    } catch (error) {
        console.error('DeleteOrder Error:', error);
        next(error);
    }
}

// RAZORPAY WEBHOOK HANDLER
export const handleRazorpayWebhook = async (req, res, next) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return res.status(400).json({ 
                success: false,
                message: 'Webhook secret not configured' 
            });
        }

        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing webhook signature header' 
            });
        }

        // Validate req.body exists and is a Buffer or string
        if (!req.body) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing request body' 
            });
        }

        let bodyString;
        try {
            bodyString = typeof req.body === 'string' ? req.body : req.body.toString();
        } catch (error) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid request body format' 
            });
        }

        const expected = crypto
            .createHmac('sha256', webhookSecret)
            .update(bodyString)
            .digest('hex');

        if (expected !== signature) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid signature' 
            });
        }

        // Parse raw body JSON
        let payload;
        try {
            payload = JSON.parse(bodyString);
        } catch (error) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid JSON payload' 
            });
        }

        if (!payload || !payload.event) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid webhook payload structure' 
            });
        }

        const event = payload.event;

        if (event === 'payment.captured' || event === 'order.paid') {
            let orderId = null;
            let paymentId = null;

            // Safely extract order ID and payment ID
            if (payload.payload) {
                if (payload.payload.payment && payload.payload.payment.entity) {
                    orderId = payload.payload.payment.entity.order_id;
                    paymentId = payload.payload.payment.entity.id;
                } else if (payload.payload.order && payload.payload.order.entity) {
                    orderId = payload.payload.order.entity.id;
                }
            }

            if (orderId) {
                const updateResult = await Order.findOneAndUpdate(
                    { 
                        razorpayOrderId: orderId,
                        paymentStatus: { $ne: 'Paid' } // Prevent duplicate updates
                    },
                    {
                        paymentStatus: 'Paid',
                        razorpayPaymentId: paymentId
                    },
                    { new: true }
                );

                if (!updateResult) {
                    console.warn(`Webhook: Order ${orderId} not found or already paid`);
                }
            } else {
                console.warn('Webhook: Could not extract order ID from payload', payload);
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Razorpay Webhook error:', error);
        next(error);
    }
};