# DivineKart API - Postman Collection

**Base URL:** `http://localhost:3000`

---

## 🔐 Authentication

Most endpoints require authentication. After login, use the token in:
- **Header:** `Authorization: Bearer <token>`
- **Cookie:** `token=<token>` (if using cookies)

---

## 📋 User Endpoints

### Register User
```
POST http://localhost:3000/api/users/register
```
**Body (JSON):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```
POST http://localhost:3000/api/users/login
```
**Body (JSON):**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get User Details (Auth Required)
```
GET http://localhost:3000/api/users/user-details
```

### Update User (Auth Required)
```
PUT http://localhost:3000/api/users/update-user
```
**Body (JSON):**
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

### Forgot Password
```
PUT http://localhost:3000/api/users/forgot-password
```
**Body (JSON):**
```json
{
  "email": "john@example.com"
}
```

### Verify Forgot Password OTP
```
PUT http://localhost:3000/api/users/verify-forgot-password-otp
```
**Body (JSON):**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

### Reset Password
```
PUT http://localhost:3000/api/users/reset-password
```
**Body (JSON):**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

### Refresh Token
```
POST http://localhost:3000/api/users/refresh-token
```

---

## 🛍️ Product Endpoints

### Get All Products
```
GET http://localhost:3000/api/products
```

### Create Product (Admin Auth Required)
```
POST http://localhost:3000/api/products
```
**Headers:**
- `Authorization: Bearer <admin_token>`

**Body (form-data):**
- `name`: Product name
- `description`: Product description
- `price`: Product price (number)
- `category`: Product category
- `stock`: Stock quantity (number)
- `image`: Image file (JPEG, PNG, WebP - max 5MB)

### Delete Product (Admin Auth Required)
```
DELETE http://localhost:3000/api/products/:id
```
**Example:**
```
DELETE http://localhost:3000/api/products/507f1f77bcf86cd799439011
```

---

## 🛒 Cart Endpoints (All require Auth)

### Get Cart
```
GET http://localhost:3000/api/cart
```

### Add to Cart
```
POST http://localhost:3000/api/cart
```
**Body (JSON):**
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 2
}
```

### Update Cart Item
```
PUT http://localhost:3000/api/cart/:id
```
**Body (JSON):**
```json
{
  "quantity": 3
}
```

### Delete Cart Item
```
DELETE http://localhost:3000/api/cart/:id
```

### Clear Cart
```
PUT http://localhost:3000/api/cart/clear
```
or
```
DELETE http://localhost:3000/api/cart/clear
```

---

## 📦 Order Endpoints (All require Auth)

### Create Order
```
POST http://localhost:3000/api/orders
```
**Body (JSON):**
```json
{
  "items": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "quantity": 2
    }
  ],
  "addressId": "507f1f77bcf86cd799439012",
  "paymentMethod": "razorpay"
}
```

### Verify Razorpay Payment
```
POST http://localhost:3000/api/orders/verify
```
**Body (JSON):**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

### Get All Orders
```
GET http://localhost:3000/api/orders
```

### Get Order by ID
```
GET http://localhost:3000/api/orders/:id
```

### Update Order
```
PUT http://localhost:3000/api/orders/:id
```
**Body (JSON):**
```json
{
  "status": "shipped"
}
```

### Delete Order
```
DELETE http://localhost:3000/api/orders/:id
```

---

## 📍 Address Endpoints (All require Auth)

### Create Address
```
POST http://localhost:3000/api/address/create
```
**Body (JSON):**
```json
{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "phone": "+1234567890"
}
```

### Get Addresses
```
GET http://localhost:3000/api/address/get
```

### Update Address
```
PUT http://localhost:3000/api/address/update
```
**Body (JSON):**
```json
{
  "addressId": "507f1f77bcf86cd799439012",
  "street": "456 Updated St",
  "city": "Los Angeles",
  "state": "CA",
  "zipCode": "90001",
  "country": "USA",
  "phone": "+1234567890"
}
```

### Delete/Disable Address
```
DELETE http://localhost:3000/api/address/disable
```
**Body (JSON):**
```json
{
  "addressId": "507f1f77bcf86cd799439012"
}
```

---

## 🎯 Recommendation Endpoints

### Get Personalized Recommendations (Optional Auth)
```
GET http://localhost:3000/api/recommendations
```

### Get Popular Products
```
GET http://localhost:3000/api/recommendations/popular
```

### Get Similar Products
```
GET http://localhost:3000/api/recommendations/similar/:productId
```
**Example:**
```
GET http://localhost:3000/api/recommendations/similar/507f1f77bcf86cd799439011
```

### Get Frequently Bought Together
```
GET http://localhost:3000/api/recommendations/frequently-bought-together/:productId
```
**Example:**
```
GET http://localhost:3000/api/recommendations/frequently-bought-together/507f1f77bcf86cd799439011
```

---

## 🔔 Webhook Endpoints

### Razorpay Webhook
```
POST http://localhost:3000/webhooks/razorpay
```
**Note:** This endpoint requires raw JSON body for signature verification.

---

## 🏥 Health Check Endpoints

### Health Check
```
GET http://localhost:3000/healthz
```

### Readiness Check
```
GET http://localhost:3000/readyz
```

### CSRF Token
```
GET http://localhost:3000/csrf-token
```

---

## 📝 Notes

1. **Rate Limiting:**
   - General endpoints: 100 requests per 15 minutes per IP
   - Auth endpoints: 5 requests per 15 minutes per IP

2. **File Uploads:**
   - Max file size: 5MB
   - Allowed formats: JPEG, JPG, PNG, WebP

3. **Authentication:**
   - Use JWT token in `Authorization: Bearer <token>` header
   - Or use cookie-based authentication with `token` cookie

4. **Admin Routes:**
   - Product creation/deletion requires admin authentication
   - Regular user tokens won't work for admin endpoints

5. **CORS:**
   - Default allowed origins: `http://localhost:3000`, `http://localhost:3001`
   - Configure via `ALLOWED_ORIGINS` environment variable

---

## 🚀 Quick Start for Postman

1. **Set Base URL Variable:**
   - Create a variable `base_url` = `http://localhost:3000`

2. **Login First:**
   - Use `POST {{base_url}}/api/users/login`
   - Save the token from response

3. **Set Authorization:**
   - Create an environment variable `token`
   - Use `Bearer {{token}}` in Authorization header

4. **Test Endpoints:**
   - Start with health check: `GET {{base_url}}/healthz`
   - Then try product listing: `GET {{base_url}}/api/products`
   - Then authenticated endpoints with your token

