// Setup environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt';
process.env.MONGO_URI = 'mongodb://localhost:27017/divinekartest';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.PORT = '3000';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001';
process.env.SECRET_KEY_ACCESS_TOKEN = 'test-access-token';
process.env.SECRET_KEY_REFRESH_TOKEN = 'test-refresh-token';
process.env.RAZORPAY_KEY_ID = 'test-razorpay-key';
process.env.RAZORPAY_KEY_SECRET = 'test-razorpay-secret';
