import Category from "../models/categoryModel.js";

export const getCategoriesController = async (request, response) => {
    try {
        const data = await Category.find({ isActive: true }).sort({ createdAt: 1 });

        return response.json({
            message: "Category list",
            error: false,
            success: true,
            data: data
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

export const createCategoryController = async (request, response) => {
    try {
        const { id, name, icon } = request.body;

        if (!id || !name) {
            return response.status(400).json({
                message: "Category id and name are required",
                error: true,
                success: false
            });
        }

        const existing = await Category.findOne({ id });
        if (existing) {
            return response.status(409).json({
                message: "Category with this id already exists",
                error: true,
                success: false
            });
        }

        const category = await Category.create({ id, name, icon: icon || '' });

        return response.status(201).json({
            message: "Category created successfully",
            error: false,
            success: true,
            data: category
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

export const seedCategoriesController = async (request, response) => {
    try {
        const categories = [
            { id: 'agarbatti', name: 'Agarbatti & Dhoop', icon: '🕯️' },
            { id: 'murti', name: 'Idols & Murti', icon: '🕉️' },
            { id: 'diya', name: 'Diya & Oil', icon: '🪔' },
            { id: 'samagri', name: 'Pujan Samagri', icon: '🥣' },
            { id: 'flowers', name: 'Flowers & Garlands', icon: '🌸' },
            { id: 'books', name: 'Spiritual Books', icon: '📖' },
            { id: 'vessels', name: 'Puja Vessels', icon: '🏺' },
            { id: 'decor', name: 'Temple Decor', icon: '🏮' },
        ];

        await Category.deleteMany({}); // Clear existing
        const data = await Category.insertMany(categories);

        return response.json({
            message: "Categories seeded successfully",
            error: false,
            success: true,
            data: data
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};
