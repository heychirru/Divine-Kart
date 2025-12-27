import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation error handler middleware
 * Catches validation errors and returns them in a standardized format
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

/**
 * User Registration Validation
 */
export const validateRegister = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[\p{L}\p{N} .'-]{1,100}$/u).withMessage('Name contains invalid characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage(
            'Password must contain uppercase, lowercase, number, and special character'
        ),
    handleValidationErrors
];

/**
 * User Login Validation
 */
export const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

/**
 * Update User Details Validation
 */
export const validateUpdateUser = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[\p{L}\p{N} .'-]{1,100}$/u).withMessage('Name contains invalid characters'),
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('mobile')
        .optional()
        .isMobilePhone('any', { strictMode: false }).withMessage('Invalid mobile number'),
    body('password')
        .optional()
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage(
            'Password must contain uppercase, lowercase, number, and special character'
        ),
    handleValidationErrors
];

/**
 * Product Creation Validation
 */
export const validateCreateProduct = [
    body('name')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
    body('category')
        .trim()
        .notEmpty().withMessage('Category is required')
        .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    body('OldPrice')
        .notEmpty().withMessage('Old price is required')
        .isFloat({ min: 0 }).withMessage('Old price must be a positive number'),
    body('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number')
        .custom((value, { req }) => {
            if (parseFloat(value) > parseFloat(req.body.OldPrice)) {
                throw new Error('Price cannot be greater than old price');
            }
            return true;
        }),
    body('imageUrl')
        .optional()
        .trim()
        .isURL().withMessage('Invalid image URL format'),
    handleValidationErrors
];

/**
 * Add to Cart Validation
 */
export const validateAddToCart = [
    body('productId')
        .optional()
        .isMongoId().withMessage('Invalid product ID format'),
    body('itemId')
        .optional()
        .isMongoId().withMessage('Invalid item ID format'),
    body('quantity')
        .optional()
        .isInt({ min: 1, max: 1000 }).withMessage('Quantity must be between 1 and 1000'),
    handleValidationErrors
];

/**
 * Update Cart Item Validation
 */
export const validateUpdateCart = [
    body('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 1, max: 1000 }).withMessage('Quantity must be between 1 and 1000'),
    param('id')
        .isMongoId().withMessage('Invalid cart item ID'),
    handleValidationErrors
];

/**
 * Create Order Validation
 */
export const validateCreateOrder = [
    body('items')
        .isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('items.*.id')
        .isMongoId().withMessage('Invalid product ID in items'),
    body('items.*.quantity')
        .isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
    body('customer.name')
        .trim()
        .notEmpty().withMessage('Customer name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('customer.email')
        .trim()
        .notEmpty().withMessage('Customer email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('customer.phone')
        .notEmpty().withMessage('Phone is required')
        .isMobilePhone('any', { strictMode: false }).withMessage('Invalid phone number'),
    body('customer.address')
        .trim()
        .notEmpty().withMessage('Address is required')
        .isLength({ min: 5, max: 500 }).withMessage('Address must be between 5 and 500 characters'),
    body('paymentMethod')
        .notEmpty().withMessage('Payment method is required')
        .isIn(['COD', 'Online Payment']).withMessage('Invalid payment method. Must be either "COD" or "Online Payment"'),
    body('shipping')
        .optional()
        .isFloat({ min: 0 }).withMessage('Shipping must be a non-negative number'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
    handleValidationErrors
];

/**
 * Address Validation
 */
export const validateAddress = [
    body('address_line')
        .trim()
        .notEmpty().withMessage('Address line is required')
        .isLength({ min: 5, max: 200 }).withMessage('Address must be between 5 and 200 characters'),
    body('city')
        .trim()
        .notEmpty().withMessage('City is required')
        .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters'),
    body('state')
        .trim()
        .notEmpty().withMessage('State is required')
        .isLength({ min: 2, max: 50 }).withMessage('State must be between 2 and 50 characters'),
    body('pincode')
        .trim()
        .notEmpty().withMessage('Pincode is required')
        .matches(/^\d{5,6}$/).withMessage('Pincode must be 5-6 digits'),
    body('country')
        .trim()
        .notEmpty().withMessage('Country is required')
        .isLength({ min: 2, max: 50 }).withMessage('Country must be between 2 and 50 characters'),
    body('mobile')
        .notEmpty().withMessage('Mobile number is required')
        .isMobilePhone('any', { strictMode: false }).withMessage('Invalid mobile number'),
    handleValidationErrors
];

/**
 * Pagination Validation
 */
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be at least 1'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

/**
 * Forgot Password Validation
 */
export const validateForgotPassword = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    handleValidationErrors
];

/**
 * OTP Verification Validation
 */
export const validateOtpVerification = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must contain only numbers'),
    handleValidationErrors
];

/**
 * Reset Password Validation
 */
export const validateResetPassword = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage(
            'Password must contain uppercase, lowercase, number, and special character'
        ),
    body('confirmPassword')
        .notEmpty().withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    handleValidationErrors
];
