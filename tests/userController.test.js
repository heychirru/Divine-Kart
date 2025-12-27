import request from 'supertest';
import app from '../app.js';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

// Mock data
const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123@'
};

const invalidUser = {
    name: 'Invalid',
    email: 'invalid-email',
    password: 'weak'
};

describe('User Authentication Tests', () => {
    
    beforeEach(async () => {
        // Clean up test data before each test
        await User.deleteMany({ email: testUser.email });
    });

    afterAll(async () => {
        // Clean up after all tests
        await User.deleteMany({ email: { $in: [testUser.email, invalidUser.email] } });
    });

    describe('POST /api/users/register', () => {
        test('Should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/users/register')
                .send(testUser);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe(testUser.email);
        });

        test('Should reject registration with invalid email', async () => {
            const res = await request(app)
                .post('/api/users/register')
                .send({
                    ...testUser,
                    email: 'invalid-email'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('Should reject registration with weak password', async () => {
            const res = await request(app)
                .post('/api/users/register')
                .send({
                    ...testUser,
                    password: 'weak'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('Should reject duplicate email registration', async () => {
            // First registration
            await request(app)
                .post('/api/users/register')
                .send(testUser);

            // Attempt duplicate
            const res = await request(app)
                .post('/api/users/register')
                .send(testUser);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('already registered');
        });

        test('Should reject missing required fields', async () => {
            const res = await request(app)
                .post('/api/users/register')
                .send({
                    email: testUser.email
                    // missing name and password
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/users/login', () => {
        beforeEach(async () => {
            // Create a user for login tests
            await User.create({
                ...testUser,
                password: require('bcryptjs').hashSync(testUser.password, 10)
            });
        });

        test('Should login user successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/users/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
        });

        test('Should reject login with wrong password', async () => {
            const res = await request(app)
                .post('/api/users/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123@'
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('Should reject login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/users/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testUser.password
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('Should reject login with missing email', async () => {
            const res = await request(app)
                .post('/api/users/login')
                .send({
                    password: testUser.password
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/users/user-details', () => {
        let token;

        beforeEach(async () => {
            // Create a user and generate token
            const user = await User.create({
                ...testUser,
                password: require('bcryptjs').hashSync(testUser.password, 10)
            });

            token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '48h' });
        });

        test('Should get user details with valid token', async () => {
            const res = await request(app)
                .get('/api/users/user-details')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe(testUser.email);
            expect(res.body.data.password).toBeUndefined(); // Password should not be returned
        });

        test('Should reject request without token', async () => {
            const res = await request(app)
                .get('/api/users/user-details');

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        test('Should reject request with invalid token', async () => {
            const res = await request(app)
                .get('/api/users/user-details')
                .set('Authorization', 'Bearer invalid-token');

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});
