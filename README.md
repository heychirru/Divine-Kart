# Divine-Kart 🛒

A modern, scalable e-commerce backend API built with Node.js, Express, and MongoDB. Divine-Kart provides a complete RESTful API for managing products, users, shopping carts, orders, and more.

## ✨ Features

- 🔐 **Authentication & Authorization**
  - JWT-based authentication with refresh tokens
  - Role-based access control (Admin/User)
  - Password reset via email
  - Email verification with OTP
  - Secure password hashing with bcrypt

- 🛍️ **Product Management**
  - CRUD operations for products
  - Image upload with Cloudinary integration
  - Product search and filtering
  - Category-based organization
  - Inventory management

- 🛒 **Shopping Cart**
  - Add/remove items
  - Update quantities
  - Persistent cart storage
  - Cart synchronization

- 📦 **Order Management**
  - Order creation and tracking
  - Razorpay payment integration
  - Webhook support for payment verification
  - Order status updates
  - Invoice generation

- 👤 **User Management**
  - User registration and profile management
  - Address management (multiple addresses)
  - Order history
  - User preferences

- 🎯 **Recommendations**
  - Personalized product recommendations
  - Collaborative filtering support
  - Redis caching for performance

- 🚀 **Performance & Security**
  - Redis caching layer
  - Rate limiting
  - CSRF protection
  - Helmet.js security headers
  - Input validation and sanitization
  - Error handling middleware

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer + Cloudinary
- **Payment**: Razorpay
- **Email**: Nodemailer + Resend
- **Validation**: Express-validator
- **Security**: Helmet, CORS, CSRF protection
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Redis (v6 or higher)
- npm or yarn
- Git

## 🚀 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Divine-Kart
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000

   # MongoDB Configuration
   MONGO_URI=mongodb://localhost:27017/divinekart

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_REFRESH_SECRET=your-refresh-token-secret

   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   FRONTEND_URL=http://localhost:3000

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Razorpay Configuration
   RAZORPAY_KEY_ID=rzp_test_xxx
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   RESEND_API_KEY=your-resend-api-key
   ```

5. **Start MongoDB and Redis**
   ```bash
   # MongoDB (if running locally)
   mongod

   # Redis (if running locally)
   redis-server
   ```

6. **Run the application**
   ```bash
   # Development mode (with nodemon)
   npm start

   # Production mode
   node app.js
   ```

7. **Verify the server is running**
   - Open http://localhost:3000 in your browser
   - You should see the welcome message

## 🐳 Docker Setup

For a quick start with Docker, see the [Docker Setup Guide](./DOCKER.md).

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - User login
- `POST /api/users/logout` - User logout
- `POST /api/users/refresh-token` - Refresh access token
- `POST /api/users/forgot-password` - Request password reset
- `POST /api/users/reset-password` - Reset password
- `POST /api/users/verify-email` - Verify email with OTP

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/search` - Search products
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:itemId` - Update cart item quantity
- `DELETE /api/cart/:itemId` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order status (Admin only)
- `POST /webhooks/razorpay` - Razorpay webhook handler

### Addresses
- `GET /api/address` - Get user's addresses
- `POST /api/address` - Add new address
- `PUT /api/address/:id` - Update address
- `DELETE /api/address/:id` - Delete address

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations

### Health Checks
- `GET /healthz` - Health check endpoint
- `GET /readyz` - Readiness check endpoint

For detailed API documentation, import the Postman collection: `DivineKart.postman_collection.json`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 📁 Project Structure

```
Divine-Kart/
├── config/              # Configuration files
│   ├── db.js           # MongoDB connection
│   ├── redis.js        # Redis connection
│   └── sendmail.js     # Email configuration
├── controllers/         # Route controllers
│   ├── addressController.js
│   ├── cartController.js
│   ├── orderController.js
│   ├── productController.js
│   ├── recommendationController.js
│   └── userController.js
├── middleware/         # Custom middleware
│   ├── adminAuth.js    # Admin authorization
│   ├── auth.js         # JWT authentication
│   ├── multer.js       # File upload handling
│   └── validation.js   # Input validation
├── models/             # Mongoose models
│   ├── addressModel.js
│   ├── cartModel.js
│   ├── orderModel.js
│   ├── productModel.js
│   └── userModel.js
├── routes/             # API routes
│   ├── addressRoutes.js
│   ├── cartRoutes.js
│   ├── orderRoutes.js
│   ├── productRoutes.js
│   ├── recommendationRoutes.js
│   └── userRoutes.js
├── services/           # Business logic services
│   └── recommendationService.js
├── utils/              # Utility functions
│   ├── forgotPasswordTemplate.js
│   ├── generatedAccessToken.js
│   ├── generatedOtp.js
│   ├── generatedRefreshToken.js
│   ├── redisCache.js
│   ├── uploadImageClodinary.js
│   └── verifyEmailTemplate.js
├── app.js              # Express app entry point
├── package.json        # Dependencies and scripts
└── README.md           # Project documentation
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Cross-site request forgery protection
- **Helmet.js**: Security headers
- **Input Validation**: Express-validator for request validation
- **CORS**: Configurable cross-origin resource sharing
- **Environment Variables**: Sensitive data stored securely

## 🧹 Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production/test) | Yes |
| `PORT` | Server port | No (default: 3000) |
| `MONGO_URI` | MongoDB connection string | Yes |
| `REDIS_HOST` | Redis host | Yes |
| `REDIS_PORT` | Redis port | Yes |
| `REDIS_PASSWORD` | Redis password | No |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `RAZORPAY_KEY_ID` | Razorpay key ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | Yes |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret | Yes |
| `EMAIL_HOST` | SMTP host | Yes |
| `EMAIL_PORT` | SMTP port | Yes |
| `EMAIL_USER` | SMTP username | Yes |
| `EMAIL_PASS` | SMTP password | Yes |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👤 Author

**Chiranjit Das**

## 🙏 Acknowledgments

- Express.js community
- MongoDB and Redis teams
- All open-source contributors



**Note**: This is a backend API. For the frontend implementation roadmap, see [FRONTEND_ROADMAP.md](.Backend/FRONTEND_ROADMAP.md).
