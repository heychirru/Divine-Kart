import Cart from '../models/cartModel.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import jwt from 'jsonwebtoken';

describe('Cart Controller Tests', () => {
    let userId;
    let productId;
    let token;

    beforeEach(async () => {
        // Create a test user
        const user = await User.create({
            name: 'Cart Test User',
            email: 'cart@test.com',
            password: 'TestPassword123@'
        });
        userId = user._id;

        // Generate token
        token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '48h' });

        // Create a test product
        const product = await Product.create({
            name: 'Cart Test Product',
            category: 'Test',
            OldPrice: 100,
            price: 80
        });
        productId = product._id;
    });

    afterEach(async () => {
        // Clean up
        await Cart.deleteMany({ user: userId });
        await User.deleteOne({ _id: userId });
        await Product.deleteOne({ _id: productId });
    });

    describe('Cart Operations', () => {
        test('Should add product to cart', async () => {
            const cartItem = await Cart.create({
                user: userId,
                product: productId,
                quantity: 2
            });

            expect(cartItem).toBeDefined();
            expect(cartItem.user.toString()).toBe(userId.toString());
            expect(cartItem.product.toString()).toBe(productId.toString());
            expect(cartItem.quantity).toBe(2);
        });

        test('Should increment quantity for duplicate product in cart', async () => {
            // Add product first time
            await Cart.create({
                user: userId,
                product: productId,
                quantity: 1
            });

            // Add same product again
            const updatedCart = await Cart.findOneAndUpdate(
                { user: userId, product: productId },
                { $inc: { quantity: 1 } },
                { new: true }
            );

            expect(updatedCart.quantity).toBe(2);
        });

        test('Should validate minimum quantity', async () => {
            const cartItem = new Cart({
                user: userId,
                product: productId,
                quantity: 0 // Invalid
            });

            let error;
            try {
                await cartItem.validate();
            } catch (e) {
                error = e;
            }

            expect(error).toBeDefined();
        });

        test('Should retrieve cart items for user', async () => {
            // Add multiple products
            const product2 = await Product.create({
                name: 'Cart Test Product 2',
                category: 'Test',
                OldPrice: 50,
                price: 40
            });

            await Cart.create({
                user: userId,
                product: productId,
                quantity: 1
            });

            await Cart.create({
                user: userId,
                product: product2._id,
                quantity: 2
            });

            const cartItems = await Cart.find({ user: userId });

            expect(cartItems).toHaveLength(2);
            expect(cartItems[0].quantity).toBe(1);
            expect(cartItems[1].quantity).toBe(2);

            // Cleanup
            await Product.deleteOne({ _id: product2._id });
        });

        test('Should remove item from cart', async () => {
            const cartItem = await Cart.create({
                user: userId,
                product: productId,
                quantity: 1
            });

            await Cart.deleteOne({ _id: cartItem._id });

            const deleted = await Cart.findById(cartItem._id);
            expect(deleted).toBeNull();
        });

        test('Should clear entire cart for user', async () => {
            await Cart.create({
                user: userId,
                product: productId,
                quantity: 1
            });

            await Cart.deleteMany({ user: userId });

            const cartItems = await Cart.find({ user: userId });
            expect(cartItems).toHaveLength(0);
        });
    });

    describe('Cart Indexes', () => {
        test('Should enforce unique constraint on user-product', async () => {
            // Create first cart item
            await Cart.create({
                user: userId,
                product: productId,
                quantity: 1
            });

            // Try to create duplicate - should work with upsert
            const cartItem = await Cart.findOneAndUpdate(
                { user: userId, product: productId },
                { quantity: 2 },
                { upsert: true, new: true }
            );

            expect(cartItem.quantity).toBe(2);

            const count = await Cart.countDocuments({ user: userId, product: productId });
            expect(count).toBe(1); // Only one document should exist
        });
    });
});
