import Store from '../models/storeModel.js';

export const checkStoreOwner = async (req, res, next) => {
    try {
        const storeId = req.body?.store || req.query?.store || req.params?.storeId;
        
        if (!storeId) {
            return res.status(400).json({ success: false, message: "Store ID is required." });
        }

        const store = await Store.findById(storeId);
        
        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found." });
        }

        if (store.owner.toString() !== req.userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Access denied. You are not the owner of this store." });
        }

        req.store = store;
        next();
    } catch (error) {
        console.error("[checkStoreOwner] Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
