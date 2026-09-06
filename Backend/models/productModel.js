import mongoose from "mongoose";


const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter product name"],
        trim: true,
    },
    description: {
        type: String,
        default: "",
    },
    category: {
        type: String,
        required: [true, "Please enter product category"],
    },
    OldPrice: {
        type: Number,
        required: [true, "Please enter product old price"],
        min: 0
    },
    price: {
        type: Number,
        required: [true, "Please enter product price"],
        min: 0
    },
    imageUrl: {
        type: String,
        required: false,
    },
    stock: {
        type: Number,
        default: 0,
        min: 0,
    },
    store: {
        type: mongoose.Schema.ObjectId,
        ref: 'Store',
        required: false,
    },
    storePrice: {
        type: Number,
        min: 0
    },
    storeStock: {
        type: Number,
        default: 0,
        min: 0
    }
},
    {
        timestamps: true,
    }
);
export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);