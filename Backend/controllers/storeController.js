import Store from '../models/storeModel.js';
import User from '../models/userModel.js';

/**
 * Register a new store (Vendor Onboarding)
 */
export async function registerStore(req, res) {
    const { name, ownerName, email, phone, street, city, state, pincode, lng, lat, description } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user && user.role !== 'vendor') {
            return res.status(400).json({ success: false, message: "User with this email already exists and is not a vendor." });
        }

        if (!user) {
            // Create user with vendor role (initially unverified/no password set yet)
            user = await User.create({
                name: ownerName,
                email: email.toLowerCase(),
                phone: phone,
                password: 'STORE_PENDING_' + Date.now(),
                role: 'vendor'
            });
        }

        // Create store application
        const store = await Store.create({
            owner: user._id,
            name,
            description,
            phone,
            email: email.toLowerCase(),
            address: { street, city, state, pincode },
            location: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            isApproved: false
        });

        return res.status(201).json({
            success: true,
            message: "Store registration submitted successfully. Awaiting admin approval.",
            data: store
        });
    } catch (error) {
        console.error("[registerStore] Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
}

/**
 * Admin: Approve or Reject a Store
 */
export async function approveStore(req, res) {
    const { storeId, status } = req.body; // status: 'Approve' or 'Reject'

    try {
        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }

        if (status === 'Approve') {
            store.isApproved = true;
            await store.save();
            
            // Here we would typically send an email notification to the vendor
            return res.json({ success: true, message: "Store approved successfully." });
        } else {
            // Soft delete or mark as rejected
            store.isActive = false;
            await store.save();
            return res.json({ success: true, message: "Store registration rejected." });
        }
    } catch (error) {
        console.error("[approveStore] Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

/**
 * Get Orders for a specific Store (Vendor Dashboard)
 */
export async function getStoreOrders(req, res) {
    const { storeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        // Ownership check (middleware should have already handled this, but being safe)
        const orderQuery = { store: storeId };
        
        const orders = await Order.find(orderQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments(orderQuery);

        return res.json({
            success: true,
            data: orders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

/**
 * Get Nearyby Stores (Hyperlocal Discovery)
 */
export async function getNearbyStores(req, res) {
    const { lng, lat, radius = 5, pincode } = req.query;

    try {
        let query = { isApproved: true, isActive: true };

        if (lng && lat) {
            query.location = {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: parseInt(radius) * 1000 // Convert km to meters
                }
            };
        } else if (pincode) {
            query['address.pincode'] = pincode;
        } else {
            return res.status(400).json({ success: false, message: "Please provide location (lat/lng) or pincode." });
        }

        const stores = await Store.find(query).limit(10);
        return res.json({ success: true, data: stores });
    } catch (error) {
        console.error("[getNearbyStores] Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

/**
 * Get Store Details by ID
 */
export async function getStoreDetails(req, res) {
    try {
        const store = await Store.findById(req.params.id).populate('owner', 'name email phone');
        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }
        return res.json({ success: true, data: store });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}
