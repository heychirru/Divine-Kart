import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    addressLine: {
        type: String,
        default: ""
    },
    city: {
        type: String,
        default: ""
    },
    state: {
        type: String,
        default: ""
    },
    pincode: {
        type: String
    },
    country: {
        type: String
    },
    mobile: {
        type: Number,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
})

const Address = mongoose.model('address', addressSchema);

export default Address;