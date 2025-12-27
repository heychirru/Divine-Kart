import { validateRegister, validateLogin, validateCreateProduct, validateCreateOrder } from '../middleware/validation.js';
import { body, validationResult } from 'express-validator';

// Mock request/response objects
const createMockReq = (data = {}) => ({
    body: data,
    query: {},
    params: {}
});

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const createMockNext = () => jest.fn();

describe('Validation Middleware Tests', () => {
    
    describe('User Registration Validation', () => {
        test('Should pass validation with correct data', async () => {
            const validData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'TestPassword123@'
            };

            const req = createMockReq(validData);
            const res = createMockRes();
            const next = createMockNext();

            // Run each validator in the chain
            for (const validator of validateRegister.slice(0, -1)) {
                await validator.run(req);
            }

            // Check for errors
            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(true);
        });

        test('Should fail validation with invalid email', async () => {
            const invalidData = {
                name: 'John Doe',
                email: 'invalid-email',
                password: 'TestPassword123@'
            };

            const req = createMockReq(invalidData);

            // Run email validator
            await validateRegister[1].run(req);

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(false);
        });

        test('Should fail validation with weak password', async () => {
            const weakPassword = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'weak'
            };

            const req = createMockReq(weakPassword);

            // Run password validator
            await validateRegister[2].run(req);

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(false);
        });

        test('Should fail validation with short name', async () => {
            const shortName = {
                name: 'J',
                email: 'john@example.com',
                password: 'TestPassword123@'
            };

            const req = createMockReq(shortName);

            // Run name validator
            await validateRegister[0].run(req);

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(false);
        });
    });

    describe('Login Validation', () => {
        test('Should pass validation with correct credentials', async () => {
            const validData = {
                email: 'user@example.com',
                password: 'TestPassword123@'
            };

            const req = createMockReq(validData);

            for (const validator of validateLogin.slice(0, -1)) {
                await validator.run(req);
            }

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(true);
        });

        test('Should fail validation without email', async () => {
            const noEmail = {
                password: 'TestPassword123@'
            };

            const req = createMockReq(noEmail);

            await validateLogin[0].run(req);

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(false);
        });
    });

    describe('Product Creation Validation', () => {
        test('Should pass validation with correct product data', async () => {
            const validProduct = {
                name: 'Test Product',
                category: 'Electronics',
                description: 'A great product',
                OldPrice: 100,
                price: 80,
                imageUrl: 'http://example.com/image.jpg'
            };

            const req = createMockReq(validProduct);

            for (const validator of validateCreateProduct.slice(0, -1)) {
                await validator.run(req);
            }

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(true);
        });

        test('Should fail validation when price > oldPrice', async () => {
            const invalidPrices = {
                name: 'Test Product',
                category: 'Electronics',
                OldPrice: 80,
                price: 100
            };

            const req = createMockReq(invalidPrices);

            // Run validators
            for (const validator of validateCreateProduct.slice(0, -1)) {
                await validator.run(req);
            }

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(false);
        });

        test('Should fail validation with negative prices', async () => {
            const negativePrices = {
                name: 'Test Product',
                category: 'Electronics',
                OldPrice: -50,
                price: 100
            };

            const req = createMockReq(negativePrices);

            for (const validator of validateCreateProduct.slice(0, -1)) {
                await validator.run(req);
            }

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(false);
        });
    });

    describe('Order Creation Validation', () => {
        test('Should pass validation with correct order data', async () => {
            const validOrder = {
                items: [
                    { id: '507f1f77bcf86cd799439011', quantity: 2 }
                ],
                customer: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '9876543210',
                    address: '123 Main Street'
                },
                paymentMethod: 'COD',
                shipping: 50,
                notes: 'Please deliver carefully'
            };

            const req = createMockReq(validOrder);

            for (const validator of validateCreateOrder.slice(0, -1)) {
                await validator.run(req);
            }

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(true);
        });

        test('Should fail validation with empty items', async () => {
            const noItems = {
                items: [],
                customer: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '9876543210',
                    address: '123 Main Street'
                },
                paymentMethod: 'COD'
            };

            const req = createMockReq(noItems);

            // Items validator
            await validateCreateOrder[0].run(req);

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(false);
        });

        test('Should fail validation with invalid email', async () => {
            const invalidEmail = {
                items: [{ id: '507f1f77bcf86cd799439011', quantity: 2 }],
                customer: {
                    name: 'John Doe',
                    email: 'invalid-email',
                    phone: '9876543210',
                    address: '123 Main Street'
                },
                paymentMethod: 'COD'
            };

            const req = createMockReq(invalidEmail);

            // Run all validators
            for (const validator of validateCreateOrder.slice(0, -1)) {
                await validator.run(req);
            }

            const errors = validationResult(req);
            expect(errors.isEmpty()).toBe(false);
        });
    });
});
