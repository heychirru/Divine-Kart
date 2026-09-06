import Store from '../models/storeModel.js';

/**
 * Find the nearest approved + active store to a given coordinate.
 * Uses MongoDB 2dsphere $near index for sub-100ms performance.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{store: object|null, routingMethod: string}>}
 */
export async function findNearestStoreByCoords(lat, lng) {
    const store = await Store.findOne({
        isApproved: true,
        isActive: true,
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(lng), parseFloat(lat)]
                },
                $maxDistance: 50000
            }
        }
    }).lean();

    if (store) {
        const storeLng = store.location.coordinates[0];
        const storeLat = store.location.coordinates[1];
        const distanceKm = haversineKm(lat, lng, storeLat, storeLng);
        const radiusKm = store.serviceRadius ?? 5;
        if (distanceKm > radiusKm) {
            return { store: null, routingMethod: 'Proximity' };
        }
    }

    return { store: store || null, routingMethod: 'Proximity' };
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


/**
 * Find an approved + active store that serves a given pincode.
 * Checks store's declared pincodes[] list AND store's own address.pincode.
 *
 * @param {string} pincode
 * @returns {Promise<{store: object|null, routingMethod: string}>}
 */
export async function findStoreByPincode(pincode) {
    const store = await Store.findOne({
        isApproved: true,
        isActive: true,
        $or: [
            { pincodes: pincode },
            { 'address.pincode': pincode }
        ]
    }).lean();

    return { store: store || null, routingMethod: 'Pincode' };
}

/**
 * Find an approved + active store by matching city name (case-insensitive).
 * Used as a last-resort fallback when no coords or pincode match is available.
 *
 * @param {string} city
 * @returns {Promise<{store: object|null, routingMethod: string}>}
 */
export async function findStoreByCity(city) {
    const escapedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const store = await Store.findOne({
        isApproved: true,
        isActive: true,
        'address.city': { $regex: new RegExp(`^${escapedCity}$`, 'i') }
    }).lean();

    return { store: store || null, routingMethod: 'City' };
}

/**
 * Master routing function.
 * Priority: geo coords → pincode list → city name → first approved store (last resort).
 * Returns { store, routingMethod } — store may be null only if zero approved stores exist.
 * Order creation is NEVER blocked — backwards compatible.
 *
 * @param {object|string} shippingAddress - { lat, lng, pincode, city, ... }
 * @returns {Promise<{store: object|null, routingMethod: string}>}
 */
export async function resolveStoreForOrder(shippingAddress) {
    try {
        const addr = typeof shippingAddress === 'string'
            ? JSON.parse(shippingAddress)
            : shippingAddress;

        // 1. Geo coordinates (most precise)
        if (Number.isFinite(addr?.lat) && Number.isFinite(addr?.lng)) {
            const result = await findNearestStoreByCoords(addr.lat, addr.lng);
            if (result.store) {
                console.log(`[routingService] Routed by geo coords to store: ${result.store.name}`);
                return result;
            }
        }

        // 2. Pincode match
        if (addr?.pincode) {
            const result = await findStoreByPincode(addr.pincode);
            if (result.store) {
                console.log(`[routingService] Routed by pincode (${addr.pincode}) to store: ${result.store.name}`);
                return result;
            }
        }

        // 3. City name match (handles manually-entered addresses without GPS)
        if (addr?.city) {
            const result = await findStoreByCity(addr.city);
            if (result.store) {
                console.log(`[routingService] Routed by city (${addr.city}) to store: ${result.store.name}`);
                return result;
            }
        }

        // 4. Last resort: assign to the first available approved store
        //    Ensures orders always reach a vendor even with incomplete address data.
        const fallbackStore = await Store.findOne({ isApproved: true, isActive: true })
            .sort({ createdAt: 1 })
            .lean();

        if (fallbackStore) {
            console.log(`[routingService] No address match — fallback to first store: ${fallbackStore.name}`);
            return { store: fallbackStore, routingMethod: 'Manual' };
        }

    } catch (err) {
        console.warn('[routingService] Failed to resolve store:', err.message);
    }

    console.warn('[routingService] No approved store found — order will have no store assigned.');
    return { store: null, routingMethod: 'Proximity' };
}
