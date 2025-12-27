import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please provide name"],    
    },
    email: {
        type: String,
        required: [true, "Please provide email"],
        unique: true,
        index: true,
    },
    password: {
        type: String,
        required: [true, "Please provide password"],
    },
    mobile: {
        type: Number,
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
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;