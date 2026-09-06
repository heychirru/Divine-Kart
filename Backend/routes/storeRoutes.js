import express from 'express';
import { approveStore, getNearbyStores, getStoreDetails, getStoreOrders, registerStore } from '../controllers/storeController.js';
import auth from '../middleware/auth.js';
import { checkStoreOwner } from '../middleware/storeOwner.js';

const storeRouter = express.Router();

// Public routes
storeRouter.post('/register', registerStore);
storeRouter.get('/nearby', getNearbyStores);
storeRouter.get('/:id', getStoreDetails);

// Protected routes
storeRouter.get('/:storeId/orders', auth, checkStoreOwner, getStoreOrders);

// Admin-only routes (auth middleware should be followed by a role check middleware if available)
storeRouter.put('/approve', auth, approveStore); 

export default storeRouter;
