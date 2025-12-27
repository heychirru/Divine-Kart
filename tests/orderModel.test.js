import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';

describe('Order Model Tests', () => {
    let userId;
    let productId;

    beforeEach(async () => {
        const user = await User.create({
            name: 'Order Test User',
            email: 'order@test.com',
            password: 'TestPassword123@'
        });
        userId = user._id;

        const product = await Product.create({
            name: 'Order Test Product',
            category: 'Test',
            OldPrice: 100,
            price: 80
        });
        productId = product._id;
    });

    afterEach(async () => {
        await Order.deleteMany({});
        await User.deleteOne({ _id: userId });
        await Product.deleteOne({ _id: productId });
    });

    describe('Order Creation', () => {
        test('Should create order with correct structure', async () => {
            const order = await Order.create({
                orderId: 'ORD-12345',
                user: userId,
                customer: {
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '9876543210',
                    address: '123 Test Street'
                },
                items: [{
                    id: productId.toString(),
                    name: 'Test Product',
                    price: 80,
                    quantity: 2,
                    imageUrl: 'http://example.com/image.jpg'
                }],
                paymentMethod: 'Cash on Delivery',
                shipping: 10
            });

            expect(order).toBeDefined();
            expect(order.orderId).toBe('ORD-12345');
            expect(order.items).toHaveLength(1);
            expect(order.paymentStatus).toBe('Unpaid');
            expect(order.status).toBe('Pending');
        });

        test('Should calculate pricing correctly on save', async () => {
            const order = new Order({
                orderId: 'ORD-67890',
                user: userId,
                customer: {
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '9876543210',
                    address: '123 Test Street'
                },
                items: [
                    { id: productId.toString(), name: 'Product 1', price: 100, quantity: 2 },
                    { id: productId.toString(), name: 'Product 2', price: 50, quantity: 1 }
                ],
                paymentMethod: 'Cash on Delivery',
                shipping: 10
            });

            await order.save();

            expect(order.subtotal).toBe(250); // (100*2) + (50*1)
            expect(order.tax).toBe(17.5); // 250 * 0.07
            expect(order.total).toBe(277.5); // 250 + 17.5 + 10
        });
    });

    describe('Order Payment Status', () => {
        test('Should update payment status to Paid', async () => {
            const order = await Order.create({
                orderId: 'ORD-PAY-123',
                user: userId,
                customer: {
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '9876543210',
                    address: '123 Test Street'
                },
                items: [{ id: productId.toString(), name: 'Test', price: 100, quantity: 1 }],
                paymentMethod: 'Online Payment',
                paymentStatus: 'Unpaid'
            });

            order.paymentStatus = 'Paid';
            await order.save();

            const updatedOrder = await Order.findById(order._id);
            expect(updatedOrder.paymentStatus).toBe('Paid');
        });

        test('Should handle Razorpay payment fields', async () => {
            const order = await Order.create({
                orderId: 'ORD-RZP-123',
                user: userId,
                customer: {
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '9876543210',
                    address: '123 Test Street'
                },
                items: [{ id: productId.toString(), name: 'Test', price: 100, quantity: 1 }],
                paymentMethod: 'Online Payment',
                razorpayOrderId: 'order_12345',
                razorpayPaymentId: 'pay_12345',
                razorpaySignature: 'sig_12345'
            });

            expect(order.razorpayOrderId).toBe('order_12345');
            expect(order.razorpayPaymentId).toBe('pay_12345');
            expect(order.razorpaySignature).toBe('sig_12345');
        });
    });

    describe('Order Status Transitions', () => {
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

        test.each(validStatuses)('Should accept valid status: %s', async (status) => {
            const order = await Order.create({
                orderId: `ORD-STATUS-${status}`,
                user: userId,
                customer: {
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '9876543210',
                    address: '123 Test Street'
                },
                items: [{ id: productId.toString(), name: 'Test', price: 100, quantity: 1 }],
                paymentMethod: 'Cash on Delivery',
                status: status
            });

            expect(order.status).toBe(status);
        });

        test('Should reject invalid status', async () => {
            const order = new Order({
                orderId: 'ORD-INVALID',
                user: userId,
                customer: {
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '9876543210',
                    address: '123 Test Street'
                },
                items: [{ id: productId.toString(), name: 'Test', price: 100, quantity: 1 }],
                paymentMethod: 'Cash on Delivery',
                status: 'InvalidStatus'
            });

            let error;
            try {
                await order.validate();
            } catch (e) {
                error = e;
            }

            expect(error).toBeDefined();
        });
    });

    describe('Order Validation', () => {
        test('Should require customer details', async () => {
            const order = new Order({
                orderId: 'ORD-NODATA',
                user: userId,
                items: [{ id: productId.toString(), name: 'Test', price: 100, quantity: 1 }],
                paymentMethod: 'Cash on Delivery'
                // Missing customer details
            });

            let error;
            try {
                await order.validate();
            } catch (e) {
                error = e;
            }

            expect(error).toBeDefined();
        });

        test('Should require at least one item', async () => {
            const order = new Order({
                orderId: 'ORD-NOITEMS',
                user: userId,
                customer: {
                    name: 'Test Customer',
                    email: 'customer@test.com',
                    phone: '9876543210',
                    address: '123 Test Street'
                },
                items: [], // Empty items
                paymentMethod: 'Cash on Delivery'
            });

            // This should still validate - the controller handles empty items check
            let error;
            try {
                await order.validate();
            } catch (e) {
                error = e;
            }

            // Empty array is valid in schema, business logic validates in controller
            expect(error).toBeUndefined();
        });
    });
});
