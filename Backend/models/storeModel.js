import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, "Store owner is required"]
    },
    name: {
        type: String,
        required: [true, "Please provide store name"],
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    logo: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        required: [true, "Please provide store contact number"]
    },
    email: {
        type: String,
        required: [true, "Please provide store email"],
        trim: true
    },
    gstin: {
        type: String,
        default: ""
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: [true, "Store coordinates are required"]
        }
    },
    serviceRadius: {
        type: Number,
        default: 5 // Default 5km
    },
    pincodes: [String],
    isApproved: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    openingHours: {
        open: String,
        close: String,
        days: [String]
    }
}, { timestamps: true });

storeSchema.index({ location: '2dsphere' });

const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

export default Store;
