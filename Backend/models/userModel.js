import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please provide name"],
    },
    email: {
        type: String,
        required: false,
        unique: true,
        index: true,
        sparse: true,
    },
    password: {
        type: String,
        required: [true, "Please provide password"],
    },
    phone: {
        type: String,
        default: null
    },
    refreshToken: {
        type: String,
        default: ""
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    lastLoginDate: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Suspended"],
        default: "Active"
    },
    addressDetails: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'address'
        }
    ],
    shoppingCart: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'cartProduct'
        }
    ],
    orderHistory: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'order'
        }
    ],
    forgotPasswordOtp: {
        type: String,
        default: null
    },
    forgotPasswordExpiry: {
        type: Date,
        default: null
    },
    loginOtp: {
        type: String,
        default: null
    },
    loginOtpExpiry: {
        type: Date,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'vendor'],
        default: 'user'
    }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;