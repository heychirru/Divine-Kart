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
        min:0
    },
    price: {
        type: Number,
        required: [true, "Please enter product price"],
        min:0
    },
    imageUrl: {
        type: String,
        required: false,
    }
},
    {
        timestamps: true,
    }
);
export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);