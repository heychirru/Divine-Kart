# DivineKart - E-Commerce Backend API

## Project Overview

**DivineKart** is a production-ready, full-featured e-commerce backend API built with Node.js and Express. It provides a complete solution for managing an online store, including user authentication, product management, shopping cart functionality, order processing, payment integration, and AI-powered product recommendations.

## Key Features

### 1. **User Management & Authentication**
- User registration and login with JWT-based authentication
- Role-based access control (User and Admin roles)
- Secure password hashing using bcryptjs
- Email verification and password reset functionality
- Refresh token mechanism for enhanced security
- Profile management for authenticated users

### 2. **Product Management**
- Complete CRUD operations for products
- Product categorization and filtering
- Image upload and management (Cloudinary integration)
- Price management with original and discounted prices
- Admin-only product creation, update, and deletion
- Public product browsing and search capabilities

### 3. **Shopping Cart System**
- Add, update, and remove items from cart
- Quantity management
- Cart persistence per user
- Clear cart functionality
- Real-time cart calculations

### 4. **Order Management**
- Order creation from cart items
- Multiple order status tracking
- Order history for users
- Admin order management
- Order details with shipping information

### 5. **Payment Integration**
- Razorpay payment gateway integration
- Secure payment processing
- Payment verification
- Webhook support for payment status updates
- Multiple payment methods support

### 6. **Address Management**
- Multiple shipping addresses per user
- Default address selection
- Address CRUD operations
- Address validation

### 7. **AI-Powered Recommendations**
- **Personalized Recommendations**: Based on user's purchase history and category preferences
- **Popular Products**: Most frequently ordered products
- **Similar Products**: Products similar to a given product (based on category and price range)
- **Frequently Bought Together**: Products often purchased together with a specific product
- Works for both authenticated and non-authenticated users

### 8. **Security Features**
- CORS protection with configurable allowed origins
- Rate limiting (100 requests/15min global, 5 requests/15min for auth endpoints)
- CSRF protection for state-changing requests
- Helmet.js for HTTP security headers
- Input validation using express-validator
- JWT token-based authentication
- Secure error handling without exposing sensitive information

### 9. **Caching & Performance**
- Redis integration for caching
- Database query optimization
- Efficient pagination support
- Health check endpoints for monitoring

### 10. **Email Services**
- Email verification templates
- Password reset functionality
- Order confirmation emails
- Nodemailer and Resend integration

## Technology Stack

### Core Technologies
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB with Mongoose 8.18.2
- **Authentication**: JSON Web Tokens (JWT)
- **File Upload**: Multer 2.0.2
- **Image Storage**: Cloudinary 2.7.0

### Security & Middleware
- **Helmet**: HTTP security headers
- **CORS**: Cross-origin resource sharing
- **CSRF**: Cross-site request forgery protection
- **Rate Limiting**: express-rate-limit
- **Validation**: express-validator

### Payment & Services
- **Payment Gateway**: Razorpay 2.9.6
- **Email Service**: Nodemailer 7.0.10, Resend 6.1.2
- **Caching**: Redis 4.6.13

### Development Tools
- **Testing**: Jest 29.7.0, Supertest 7.0.0
- **Linting**: ESLint 8.57.0
- **Formatting**: Prettier 3.2.5
- **Development**: Nodemon 3.1.10

## Project Structure

```
DivineKart-/
├── config/                      # Configuration files
│   ├── db.js                    # MongoDB connection setup
│   ├── redis.js                 # Redis connection configuration
│   └── sendmail.js              # Email service configuration
│
├── controllers/                 # Business logic handlers
│   ├── userController.js        # User authentication & management
│   ├── productController.js     # Product CRUD operations
│   ├── cartController.js        # Shopping cart operations
│   ├── orderController.js       # Order processing & payments
│   ├── addressController.js     # Address management
│   └── recommendationController.js  # AI recommendations
│
├── middleware/                  # Express middlewares
│   ├── auth.js                  # JWT authentication middleware
│   ├── adminAuth.js             # Admin authorization middleware
│   ├── multer.js                # File upload handling
│   └── validation.js            # Input validation middleware
│
├── models/                      # Mongoose data models
│   ├── userModel.js             # User schema
│   ├── productModel.js          # Product schema
│   ├── cartModel.js             # Cart schema
│   ├── orderModel.js            # Order schema
│   └── addressModel.js          # Address schema
│
├── routes/                      # API route definitions
│   ├── userRoutes.js            # User endpoints
│   ├── productRoutes.js         # Product endpoints
│   ├── cartRoutes.js            # Cart endpoints
│   ├── orderRoutes.js           # Order endpoints
│   ├── addressRoutes.js         # Address endpoints
│   └── recommendationRoutes.js  # Recommendation endpoints
│
├── services/                    # Business logic services
│   └── recommendationService.js # AI recommendation algorithms
│
├── utils/                       # Utility functions
│   ├── generatedAccessToken.js  # JWT access token generation
│   ├── generatedRefreshToken.js # Refresh token generation
│   ├── generatedOtp.js          # OTP generation
│   ├── uploadImageClodinary.js  # Cloudinary image upload
│   ├── redisCache.js            # Redis caching utilities
│   ├── forgotPasswordTemplate.js # Password reset email template
│   └── verifyEmailTemplate.js   # Email verification template
│
├── tests/                       # Test suites
│   ├── userController.test.js   # User controller tests
│   ├── productController.test.js # Product controller tests
│   ├── cartModel.test.js        # Cart model tests
│   ├── orderModel.test.js       # Order model tests
│   ├── validation.test.js       # Validation tests
│   └── setupEnv.js              # Test environment setup
│
├── coverage/                    # Test coverage reports
├── app.js                       # Express app configuration
├── package.json                 # Dependencies & scripts
├── jest.config.json             # Jest test configuration
├── README.md                    # Main documentation
├── AI_RECOMMENDATIONS_README.md # AI features documentation
└── AI_IMPLEMENTATION_GUIDE.md  # AI implementation guide
```

## API Endpoints

### Authentication Endpoints
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `POST /api/users/refresh-token` - Refresh JWT token
- `GET /api/users/profile` - Get user profile (authenticated)
- `PUT /api/users/profile` - Update user profile (authenticated)

### Product Endpoints
- `GET /api/products` - List all products (paginated, public)
- `GET /api/products/:id` - Get product details (public)
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Cart Endpoints
- `GET /api/cart` - Get user's cart (authenticated)
- `POST /api/cart` - Add/update item in cart (authenticated)
- `PUT /api/cart/:id` - Update cart item quantity (authenticated)
- `DELETE /api/cart/:id` - Remove item from cart (authenticated)
- `DELETE /api/cart/clear` - Clear entire cart (authenticated)

### Order Endpoints
- `GET /api/orders` - List orders (user's orders or all if admin)
- `GET /api/orders/:id` - Get order details (authenticated)
- `POST /api/orders` - Create new order (authenticated)
- `PUT /api/orders/:id` - Update order status (authenticated/admin)
- `DELETE /api/orders/:id` - Delete order (admin only)
- `POST /api/orders/verify` - Verify payment (authenticated)
- `POST /webhooks/razorpay` - Razorpay webhook handler

### Address Endpoints
- `GET /api/address` - List user's addresses (authenticated)
- `POST /api/address` - Add new address (authenticated)
- `PUT /api/address/:id` - Update address (authenticated)
- `DELETE /api/address/:id` - Delete address (authenticated)

### Recommendation Endpoints
- `GET /api/recommendations` - Get personalized recommendations (optional auth)
- `GET /api/recommendations/popular` - Get popular products (public)
- `GET /api/recommendations/similar/:productId` - Get similar products (public)
- `GET /api/recommendations/frequently-bought-together/:productId` - Get frequently bought together (public)

### Health Check Endpoints
- `GET /healthz` - Service health status
- `GET /readyz` - Service readiness status

## Data Models

### User Model
- `name`: User's full name
- `email`: Unique email address
- `password`: Hashed password (bcrypt)
- `role`: User role (user/admin)
- `isVerified`: Email verification status
- `createdAt`, `updatedAt`: Timestamps

### Product Model
- `name`: Product name
- `description`: Product description
- `category`: Product category
- `price`: Current price
- `OldPrice`: Original price (for discounts)
- `imageUrl`: Product image URL
- `stock`: Available stock quantity
- `createdAt`, `updatedAt`: Timestamps

### Cart Model
- `user`: Reference to User
- `product`: Reference to Product
- `quantity`: Item quantity
- `createdAt`, `updatedAt`: Timestamps

### Order Model
- `orderId`: Unique order identifier
- `user`: Reference to User
- `customer`: Customer information object
- `items`: Array of ordered items
- `shipping`: Shipping address
- `paymentMethod`: Payment method used
- `paymentStatus`: Payment status
- `status`: Order status
- `totalAmount`: Total order amount
- `createdAt`, `updatedAt`: Timestamps

### Address Model
- `user`: Reference to User
- `street`: Street address
- `city`: City
- `state`: State/Province
- `zip`: ZIP/Postal code
- `country`: Country
- `isDefault`: Default address flag
- `createdAt`, `updatedAt`: Timestamps

## AI Recommendation System

The project includes an intelligent recommendation system that uses:

1. **Collaborative Filtering**: Analyzes user purchase history to recommend products
2. **Content-Based Filtering**: Recommends products based on category and price similarity
3. **Popularity-Based**: Shows trending and frequently ordered products
4. **Association Rules**: Identifies products frequently bought together

### Recommendation Algorithms

- **Personalized Recommendations**: Analyzes user's past orders, identifies preferred categories, and recommends products from those categories
- **Similar Products**: Finds products in the same category with similar price range (±30%)
- **Frequently Bought Together**: Analyzes order data to find products commonly purchased together
- **Popular Products**: Aggregates order data to find most frequently ordered products

## Security Implementation

1. **Authentication**: JWT-based token authentication with refresh tokens
2. **Authorization**: Role-based access control (RBAC)
3. **Password Security**: Bcrypt hashing with salt rounds
4. **Input Validation**: Request validation using express-validator
5. **Rate Limiting**: Prevents brute force attacks and API abuse
6. **CORS**: Configurable origin whitelist
7. **CSRF Protection**: Token-based CSRF protection
8. **Error Handling**: Secure error messages without exposing sensitive data
9. **Helmet**: HTTP security headers
10. **Environment Variables**: Sensitive data stored in environment variables

## Testing

The project includes comprehensive test coverage:
- Unit tests for controllers
- Model validation tests
- Integration tests for API endpoints
- Test coverage reports generated using Jest

Run tests with:
```bash
npm test
```

## Environment Variables

Required environment variables:
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `PORT`: Server port (default: 3000)
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)
- `FRONTEND_URL`: Frontend base URL
- `RAZORPAY_KEY_ID`: Razorpay API key ID
- `RAZORPAY_KEY_SECRET`: Razorpay secret key
- `RAZORPAY_WEBHOOK_SECRET`: Razorpay webhook signing secret
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `REDIS_HOST`: Redis host (optional)
- `REDIS_PORT`: Redis port (optional)
- `EMAIL_HOST`: Email service host
- `EMAIL_PORT`: Email service port
- `EMAIL_USER`: Email service username
- `EMAIL_PASS`: Email service password

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DivineKart-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file with required variables

4. **Start MongoDB and Redis** (if using local instances)

5. **Run the application**
   ```bash
   npm start
   ```

## Development Scripts

- `npm start` - Start development server with nodemon
- `npm test` - Run Jest test suite
- `npm run lint` - Run ESLint validation
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code using Prettier

## Deployment Considerations

### Production Checklist
- [ ] Set all environment variables securely
- [ ] Configure HTTPS and reverse proxy (Nginx/Apache)
- [ ] Set up MongoDB with authentication and backups
- [ ] Configure Razorpay webhook endpoints
- [ ] Enable rate limiting and CORS properly
- [ ] Use PM2 or similar process manager
- [ ] Set up logging and monitoring
- [ ] Use object storage (S3, GCS) for file uploads
- [ ] Configure database connection pooling
- [ ] Enable Redis caching for performance
- [ ] Set up CI/CD pipeline
- [ ] Configure error tracking (Sentry, etc.)

## Performance Optimizations

1. **Database Indexing**: Indexes on frequently queried fields
2. **Redis Caching**: Cache frequently accessed data
3. **Pagination**: All list endpoints support pagination
4. **Query Optimization**: Efficient MongoDB queries
5. **Connection Pooling**: Database connection management

## Future Enhancements

1. **Advanced AI/ML**: Implement machine learning models for better recommendations
2. **Real-time Features**: WebSocket support for real-time updates
3. **Analytics**: User behavior tracking and analytics
4. **Inventory Management**: Advanced stock management
5. **Multi-vendor Support**: Support for multiple sellers
6. **Review System**: Product reviews and ratings
7. **Wishlist**: User wishlist functionality
8. **Coupons & Discounts**: Promotional code system
9. **Search**: Advanced product search with filters
10. **Notifications**: Push notifications for orders and updates

## License

ISC License

## Author

Chiranjit Das

## Project Status

✅ Production-ready backend API with comprehensive features including:
- Complete user management and authentication
- Full product management system
- Shopping cart functionality
- Order processing and payment integration
- AI-powered recommendations
- Security best practices
- Comprehensive testing
- Production deployment ready

---

**Note**: This is a backend API project. A frontend application is required to interact with these endpoints. The API follows RESTful principles and returns JSON responses.

