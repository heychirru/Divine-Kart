import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { verifyRazorpayPayment, createOrder, deleteOrder, getOrderById, getOrders, updateOrder } from '../controllers/orderController.js';
import { validateCreateOrder } from '../middleware/validation.js';

const orderRouter = express.Router();

//PROTECT ALL ROUTES
orderRouter.post('/', authMiddleware, validateCreateOrder, createOrder);
orderRouter.post('/verify', authMiddleware, verifyRazorpayPayment);

//PROTECTED ROUTES (require authentication)
orderRouter.get('/', authMiddleware, getOrders);
orderRouter.get('/:id', authMiddleware, getOrderById);
orderRouter.put('/:id', authMiddleware, updateOrder);
orderRouter.delete('/:id', authMiddleware, deleteOrder);

export default orderRouter;