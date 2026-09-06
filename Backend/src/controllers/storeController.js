import mongoose from 'mongoose';
import { default as sendEmail, default as sendLoginOtpEmail } from '../config/sendmail.js';
import Order from '../models/orderModel.js';
import { Product } from '../models/productModel.js';
import Store from '../models/storeModel.js';
import User from '../models/userModel.js';
import generatedOtp from '../utils/generatedOtp.js';
import geocodeAddress from '../utils/geocodeAddress.js';
import loginOtpTemplate from '../utils/loginOtpTemplate.js';
import { storeApprovedTemplate, storeRejectedTemplate } from '../utils/storeEmailTemplates.js';
import uploadImageClodinary from '../utils/uploadImageClodinary.js';


// PUBLIC — Store Registration
//  POST /api/stores/register
export async function registerStore(req, res) {
    const { name, ownerName, email, phone, street, city, state, pincode, lng, lat, description, gstin } = req.body;

    if (!name || !ownerName || !email || !phone) {
        return res.status(400).json({ success: false, message: 'name, ownerName, email, and phone are required.' });
    }

    try {
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user && user.role !== 'vendor') {
            return res.status(400).json({
                success: false,
                message: 'A non-vendor account already exists with this email. Please use a different email.'
            });
        }

        if (!user) {
            user = await User.create({
                name: ownerName,
                email: email.toLowerCase(),
                phone,
                password: 'STORE_PENDING_' + Date.now(),
                role: 'vendor'
            });
        }

        // Prevent duplicate store registration per owner
        const existingStore = await Store.findOne({ owner: user._id });
        if (existingStore) {
            return res.status(400).json({
                success: false,
                message: 'A store is already registered under this account.',
                storeStatus: existingStore.isApproved ? 'approved' : 'pending'
            });
        }

        const storeData = {
            owner: user._id,
            name,
            description: description || '',
            phone,
            email: email.toLowerCase(),
            gstin: gstin || '',
            isApproved: false
        };

        if (street || city || state || pincode) {
            storeData.address = { street, city, state, pincode };
        }

        if (lng && lat) {
            storeData.location = {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
        } else if (street || city || state || pincode) {
            // Auto-geocode from address fields
            const geo = await geocodeAddress({ street, city, state, pincode });
            if (geo) {
                storeData.location = {
                    type: 'Point',
                    coordinates: [geo.lng, geo.lat]
                };
            } else {
                storeData.location = { type: 'Point', coordinates: [0, 0] };
            }
        } else {
            // Default coordinates (required by schema) — admin must update
            storeData.location = { type: 'Point', coordinates: [0, 0] };
        }

        const store = await Store.create(storeData);

        return res.status(201).json({
            success: true,
            message: 'Store registration submitted successfully. Awaiting admin approval.',
            data: store
        });
    } catch (error) {
        console.error('[registerStore] Error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'A store with this email already exists.' });
        }
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
}

// VENDOR AUTH — OTP Login 



export async function sendVendorLoginOtp(req, res) {
    const email = req.body?.email?.trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase(), role: 'vendor' });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No vendor account found with this email. Please register your store first.'
            });
        }

        const otp = String(generatedOtp());
        const ttl = 10 * 60 * 1000; // 10 minutes

        await User.findByIdAndUpdate(user._id, {
            loginOtp: otp,
            loginOtpExpiry: new Date(Date.now() + ttl)
        });

        await sendLoginOtpEmail({
            sendTo: user.email,
            subject: 'DivineKart Vendor Login OTP',
            html: loginOtpTemplate({ name: user.name || 'Vendor', otp })
        });

        console.log(`[VENDOR AUTH] OTP for ${email}: ${otp}`);

        return res.json({ success: true, message: 'OTP sent to your registered email.' });
    } catch (error) {
        console.error('[sendVendorLoginOtp] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

export async function verifyVendorLoginOtp(req, res) {
    const email = req.body?.email?.trim().toLowerCase();
    const otp = req.body?.otp?.toString().trim();
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase(), role: 'vendor' });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Vendor account not found.' });
        }

        if (!user.loginOtp || !user.loginOtpExpiry || new Date() > new Date(user.loginOtpExpiry)) {
            return res.status(400).json({ success: false, message: 'OTP expired or not requested. Please request a new one.' });
        }

        if (otp !== user.loginOtp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        await User.findByIdAndUpdate(user._id, { loginOtp: null, loginOtpExpiry: null });

        // Generate tokens using utils
        const { default: generatedAccessToken } = await import('../utils/generatedAccessToken.js');
        const { default: generatedRefreshToken } = await import('../utils/generatedRefreshToken.js');

        const accessToken = await generatedAccessToken(user._id);
        const refreshToken = await generatedRefreshToken(user._id);


        // Fetch store info
        const store = await Store.findOne({ owner: user._id }).lean();

        return res.json({
            success: true,
            token: accessToken,
            refreshToken,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
            store: store || null
        });
    } catch (error) {
        console.error('[verifyVendorLoginOtp] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR PROFILE — My Store CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/stores/me
 * Returns the authenticated vendor's store profile.
 */
export async function getMyStore(req, res) {
    try {
        const store = await Store.findOne({ owner: req.userId })
            .populate('owner', 'name email phone')
            .lean();

        if (!store) {
            return res.status(404).json({ success: false, message: 'No store found for this account.' });
        }

        return res.json({ success: true, data: store });
    } catch (error) {
        console.error('[getMyStore] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * PUT /api/stores/me
 * Update the authenticated vendor's store profile.
 * Allows updating: description, phone, address, location, serviceRadius, pincodes, openingHours
 */
export async function updateMyStore(req, res) {
    const ALLOWED_FIELDS = ['name', 'description', 'phone', 'email', 'gstin', 'address', 'serviceRadius', 'pincodes', 'openingHours'];

    try {
        const store = await Store.findOne({ owner: req.userId });
        if (!store) {
            return res.status(404).json({ success: false, message: 'No store found for this account.' });
        }

        const updates = {};
        ALLOWED_FIELDS.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // Handle location update
        if (req.body.lng !== undefined && req.body.lat !== undefined) {
            updates.location = {
                type: 'Point',
                coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
            };
        } else if (updates.address) {
            // Auto-geocode from the updated address fields
            const addr = updates.address;
            const geo = await geocodeAddress({
                street: addr.street,
                city: addr.city,
                state: addr.state,
                pincode: addr.pincode,
            });
            if (geo) {
                updates.location = {
                    type: 'Point',
                    coordinates: [geo.lng, geo.lat]
                };
            }
        }

        const updated = await Store.findByIdAndUpdate(
            store._id,
            updates,
            { new: true, runValidators: true }
        ).lean();

        return res.json({ success: true, data: updated });
    } catch (error) {
        console.error('[updateMyStore] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * PATCH /api/stores/me/status
 * Toggle the store's isActive (online / offline) flag.
 * Returns { success, isActive, message }
 */
export async function toggleStoreStatus(req, res) {
    try {
        const store = await Store.findOne({ owner: req.userId });
        if (!store) {
            return res.status(404).json({ success: false, message: 'No store found for this account.' });
        }

        const newStatus = !store.isActive;
        const updated = await Store.findByIdAndUpdate(
            store._id,
            { isActive: newStatus },
            { new: true }
        ).lean();

        return res.json({
            success: true,
            isActive: updated.isActive,
            message: updated.isActive ? 'Store is now ONLINE' : 'Store is now OFFLINE',
            data: updated,
        });
    } catch (error) {
        console.error('[toggleStoreStatus] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

export async function updateStoreLogo(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided.' });
        }

        const store = await Store.findOne({ owner: req.userId });
        if (!store) {
            return res.status(404).json({ success: false, message: 'No store found for this account.' });
        }

        const folder = `/divinekart/stores/${store._id}/logo`;
        const uploadResult = await uploadImageClodinary(req.file, folder);
        const logoUrl = uploadResult?.url || uploadResult?.secure_url;

        if (!logoUrl) {
            return res.status(500).json({ success: false, message: 'Image upload failed.' });
        }

        const updated = await Store.findByIdAndUpdate(
            store._id,
            {
                logo: logoUrl,
                ...(store.imagekitFolder ? {} : { imagekitFolder: `/divinekart/stores/${store._id}` }),
            },
            { new: true }
        ).lean();

        return res.json({ success: true, data: updated, logoUrl });
    } catch (error) {
        console.error('[updateStoreLogo] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

// PUBLIC — Store Discovery

export async function getNearbyStores(req, res) {
    const { lng, lat, radius = 10, pincode, city, district } = req.query;

    const BASE_QUERY = { isApproved: true, isActive: true };
    const SELECT_FIELDS = 'name description logo address phone email openingHours serviceRadius pincodes location isActive';

    async function findByStrategies(baseQuery) {
        let stores = [];

        // Strategy 1: GPS proximity
        if (lat && lng && !(parseFloat(lat) === 0 && parseFloat(lng) === 0)) {
            try {
                stores = await Store.find({
                    ...baseQuery,
                    location: {
                        $near: {
                            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                            $maxDistance: parseFloat(radius) * 1000
                        }
                    }
                }).select(SELECT_FIELDS).limit(20).lean();
            } catch (geoErr) {
                console.warn('[getNearbyStores] Geo query failed, falling back:', geoErr.message);
            }
        }

        // Strategy 2: Pincode match
        if (stores.length === 0 && pincode) {
            stores = await Store.find({
                ...baseQuery,
                $or: [{ pincodes: pincode }, { 'address.pincode': pincode }]
            }).select(SELECT_FIELDS).limit(20).lean();
        }

        // Strategy 3: City name match — fuzzy word match
        if (stores.length === 0 && city) {
            const cityStr = city.trim();

            // 3a. Full city string as a substring match
            stores = await Store.find({
                ...baseQuery,
                'address.city': { $regex: new RegExp(cityStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
            }).select(SELECT_FIELDS).limit(20).lean();

            // 3b. Each significant word (≥4 chars) individually
            if (stores.length === 0) {
                const words = cityStr.split(/\s+/).filter(w => w.length >= 4);
                for (const word of words) {
                    stores = await Store.find({
                        ...baseQuery,
                        'address.city': { $regex: new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
                    }).select(SELECT_FIELDS).limit(20).lean();
                    if (stores.length > 0) break;
                }
            }
        }

        // Strategy 4: District/county match
        if (stores.length === 0 && district) {
            const distStr = district.trim();

            // 4a. Full district string as substring match
            stores = await Store.find({
                ...baseQuery,
                'address.city': { $regex: new RegExp(distStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
            }).select(SELECT_FIELDS).limit(20).lean();

            // 4b. Each significant word in the district name (≥4 chars)
            if (stores.length === 0) {
                const words = distStr.split(/\s+/).filter(w => w.length >= 4);
                for (const word of words) {
                    stores = await Store.find({
                        ...baseQuery,
                        'address.city': { $regex: new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
                    }).select(SELECT_FIELDS).limit(20).lean();
                    if (stores.length > 0) break;
                }
            }
        }

        return stores;
    }

    try {
        if (!lat && !lng && !pincode && !city && !district) {
            return res.status(400).json({ success: false, message: 'Provide lat/lng, pincode, city, or district.' });
        }

        // Fetch online (active) stores
        const onlineStores = await findByStrategies({ isApproved: true, isActive: true });

        // Fetch offline (inactive but approved) stores in the same area
        const offlineStores = await findByStrategies({ isApproved: true, isActive: false });

        // Merge: online first, then offline — deduplicate by _id
        const seenIds = new Set(onlineStores.map(s => s._id.toString()));
        const allStores = [...onlineStores];
        for (const s of offlineStores) {
            if (!seenIds.has(s._id.toString())) {
                allStores.push(s);
            }
        }

        return res.json({
            success: true,
            count: allStores.length,
            onlineCount: onlineStores.length,
            offlineCount: offlineStores.length,
            data: allStores,
        });
    } catch (error) {
        console.error('[getNearbyStores] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}


/**
 * GET /api/stores/:id
 * Get public store details by ID.
 */
export async function getStoreDetails(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid store ID.' });
        }

        const store = await Store.findById(req.params.id)
            .populate('owner', 'name email phone')
            .lean();

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found.' });
        }

        return res.json({ success: true, data: store });
    } catch (error) {
        console.error('[getStoreDetails] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * GET /api/stores/:id/products
 * Browse products available at a specific store (public).
 */
export async function getStoreProducts(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid store ID.' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const query = { store: req.params.id };
        if (req.query.category) query.category = req.query.category;

        const [products, total] = await Promise.all([
            Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Product.countDocuments(query)
        ]);

        return res.json({
            success: true,
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[getStoreProducts] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

export async function getStoreOrders(req, res) {
    const { storeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    try {
        // Verify ownership: vendor can only access their own store's orders
        const store = await Store.findById(storeId).lean();
        if (!store || store.owner.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied. You do not own this store.' });
        }

        const query = { store: storeId };
        if (status) query.status = status;

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('user', 'name email phone')   
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query)
        ]);

        return res.json({
            success: true,
            data: orders,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[getStoreOrders] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

export async function getStoreOrderById(req, res) {
    const { storeId, orderId } = req.params;
    try {
        // Verify ownership
        const store = await Store.findById(storeId).lean();
        if (!store || store.owner.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied. You do not own this store.' });
        }

        const order = await Order.findOne({ _id: orderId, store: storeId })
            .populate('user', 'name email phone')  // user is the ObjectId ref
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found in your store.' });
        }

        return res.json({ success: true, data: order });
    } catch (error) {
        console.error('[getStoreOrderById] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * PUT /api/stores/:storeId/orders/:orderId  (vendor access)
 * Vendor updates the status of an order assigned to their store.
 * Status pipeline: pending → confirmed → processing → shipped → delivered
 * Vendors may also cancel a pending/confirmed order.
 */
const VENDOR_STATUS_PIPELINE = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export async function updateStoreOrderStatus(req, res) {
    const { storeId, orderId } = req.params;
    const { status, note } = req.body;

    if (!status) {
        return res.status(400).json({ success: false, message: 'status is required.' });
    }

    const allowedStatuses = [...VENDOR_STATUS_PIPELINE, 'cancelled'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`
        });
    }

    try {
        // Verify ownership
        const storeDoc = await Store.findById(storeId).lean();
        if (!storeDoc || storeDoc.owner.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied. You do not own this store.' });
        }

        const order = await Order.findOne({ _id: orderId, store: storeId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found in your store.' });
        }

        // Prevent going backwards in the pipeline
        if (status !== 'cancelled') {
            const currentIdx = VENDOR_STATUS_PIPELINE.indexOf(order.status);
            const newIdx = VENDOR_STATUS_PIPELINE.indexOf(status);
            if (newIdx <= currentIdx) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot change status from "${order.status}" to "${status}". Orders can only move forward.`
                });
            }
        }

        // Prevent cancelling already-delivered orders
        if (status === 'cancelled' && order.status === 'delivered') {
            return res.status(400).json({ success: false, message: 'Delivered orders cannot be cancelled.' });
        }

        // Use findByIdAndUpdate (bypasses pre-save hook that recalculates totalAmount)
        const updated = await Order.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    status,
                    statusUpdatedAt: new Date(),
                    ...(note ? { statusNote: note } : {}),
                }
            },
            { new: true, runValidators: false }
        ).lean();

        return res.json({
            success: true,
            message: `Order status updated to "${status}".`,
            data: updated
        });
    } catch (error) {
        console.error('[updateStoreOrderStatus] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Store Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/stores
 * List all stores with optional filters: status, city, pincode
 */
export async function adminGetAllStores(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const query = {};
        if (req.query.status === 'active') { query.isApproved = true; query.isActive = true; }
        if (req.query.status === 'pending') { query.isApproved = false; query.isActive = true; }
        if (req.query.status === 'suspended') { query.isActive = false; }
        if (req.query.city) query['address.city'] = { $regex: req.query.city, $options: 'i' };
        if (req.query.pincode) {
            query.$or = [{ pincodes: req.query.pincode }, { 'address.pincode': req.query.pincode }];
        }

        const [stores, total] = await Promise.all([
            Store.find(query)
                .populate('owner', 'name email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Store.countDocuments(query)
        ]);

        return res.json({
            success: true,
            data: stores,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[adminGetAllStores] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * PUT /api/admin/stores/:id/approve
 * Approve or reject a pending store registration.
 */
export async function adminApproveStore(req, res) {
    const { action, reason } = req.body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, message: 'action must be "approve" or "reject".' });
    }

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid store ID.' });
        }

        const store = await Store.findById(req.params.id).populate('owner', 'name email');
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found.' });
        }

        const ownerName = store.owner?.name || 'Vendor';
        const ownerEmail = store.owner?.email;

        if (action === 'approve') {
            store.isApproved = true;
            store.isActive = true;
            await store.save();

            // Send approval email — isolated so failure doesn't affect saved state
            if (ownerEmail) {
                try {
                    await sendEmail({
                        sendTo: ownerEmail,
                        subject: `Your store "${store.name}" has been approved — DivineKart`,
                        html: storeApprovedTemplate({ storeName: store.name, ownerName })
                    });
                } catch (emailErr) {
                    console.error('[adminApproveStore] Email notification failed:', emailErr.message);
                }
            }

            return res.json({ success: true, message: 'Store approved and vendor notified.', data: store });
        } else {
            store.isApproved = false;
            store.isActive = false;
            await store.save();

            // Send rejection email — isolated so failure doesn't affect saved state
            if (ownerEmail) {
                try {
                    await sendEmail({
                        sendTo: ownerEmail,
                        subject: `Store application update — DivineKart`,
                        html: storeRejectedTemplate({ storeName: store.name, ownerName, reason: reason || '' })
                    });
                } catch (emailErr) {
                    console.error('[adminApproveStore] Rejection email failed:', emailErr.message);
                }
            }

            return res.json({ success: true, message: 'Store rejected and vendor notified.', data: store });
        }
    } catch (error) {
        console.error('[adminApproveStore] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * PUT /api/admin/stores/:id/suspend
 * Toggle store suspension — flips isActive between true/false.
 */
export async function adminSuspendStore(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid store ID.' });
        }

        const store = await Store.findById(req.params.id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found.' });
        }

        store.isActive = !store.isActive;
        await store.save();

        const action = store.isActive ? 'reactivated' : 'suspended';
        return res.json({ success: true, message: `Store ${action} successfully.`, data: store });
    } catch (error) {
        console.error('[adminSuspendStore] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * DELETE /api/admin/stores/:id
 * Permanently remove a store from the platform.
 */
export async function adminDeleteStore(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid store ID.' });
        }

        const store = await Store.findByIdAndDelete(req.params.id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found.' });
        }

        return res.json({ success: true, message: 'Store deleted successfully.' });
    } catch (error) {
        console.error('[adminDeleteStore] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

/**
 * GET /api/admin/stores/:id/orders
 * Admin: all orders routed to a specific store, with pagination.
 */
export async function adminGetStoreOrders(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid store ID.' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find({ store: req.params.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments({ store: req.params.id })
        ]);

        return res.json({
            success: true,
            data: orders,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[adminGetStoreOrders] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
