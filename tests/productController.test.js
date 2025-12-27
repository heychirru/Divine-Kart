import request from 'supertest';
import app from '../app.js';
import { Product } from '../models/productModel.js';

const testProduct = {
    name: 'Test Product',
    description: 'A test product',
    category: 'Electronics',
    OldPrice: 100,
    price: 80,
    imageUrl: 'http://example.com/image.jpg'
};

describe('Product Controller Tests', () => {
    
    afterEach(async () => {
        // Clean up test products
        await Product.deleteMany({ name: testProduct.name });
    });

    describe('GET /api/products', () => {
        beforeEach(async () => {
            // Create test products
            await Product.create([
                testProduct,
                {
                    ...testProduct,
                    name: 'Product 2',
                    price: 50,
                    OldPrice: 60
                },
                {
                    ...testProduct,
                    name: 'Product 3',
                    price: 120,
                    OldPrice: 150
                }
            ]);
        });

        test('Should get all products with default pagination', async () => {
            const res = await request(app)
                .get('/api/products');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.products)).toBe(true);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.page).toBe(1);
        });

        test('Should get products with custom pagination', async () => {
            const res = await request(app)
                .get('/api/products?page=1&limit=2');

            expect(res.status).toBe(200);
            expect(res.body.pagination.limit).toBe(2);
            expect(res.body.products.length).toBeLessThanOrEqual(2);
        });

        test('Should reject invalid pagination parameters', async () => {
            const res = await request(app)
                .get('/api/products?page=0&limit=101');

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/products', () => {
        test('Should create product with valid data', async () => {
            const res = await request(app)
                .post('/api/products')
                .send(testProduct);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.product.name).toBe(testProduct.name);
        });

        test('Should reject product with price > oldPrice', async () => {
            const res = await request(app)
                .post('/api/products')
                .send({
                    ...testProduct,
                    price: 150,
                    OldPrice: 100
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('Should reject product with missing required fields', async () => {
            const res = await request(app)
                .post('/api/products')
                .send({
                    name: testProduct.name
                    // missing category, price, oldPrice
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Missing required fields');
        });

        test('Should reject product with negative prices', async () => {
            const res = await request(app)
                .post('/api/products')
                .send({
                    ...testProduct,
                    price: -50,
                    OldPrice: -100
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('DELETE /api/products/:id', () => {
        let productId;

        beforeEach(async () => {
            const product = await Product.create(testProduct);
            productId = product._id;
        });

        test('Should delete product successfully', async () => {
            const res = await request(app)
                .delete(`/api/products/${productId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify product is deleted
            const deletedProduct = await Product.findById(productId);
            expect(deletedProduct).toBeNull();
        });

        test('Should return 404 for non-existent product', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .delete(`/api/products/${fakeId}`);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
});
