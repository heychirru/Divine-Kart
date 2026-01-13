import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getCart, addToCart, updateCartItem, deletecartItem, clearCart} from '../controllers/cartController.js';
import { validateAddToCart, validateUpdateCart } from '../middleware/validation.js';


const cartRouter = express.Router();
cartRouter.use(authMiddleware);

cartRouter.get('/', getCart);
cartRouter.post('/', validateAddToCart, addToCart);
cartRouter.put('/:id', validateUpdateCart, updateCartItem);
cartRouter.delete('/:id', deletecartItem);
cartRouter.put('/clear', clearCart); 
cartRouter.delete('/clear', clearCart);

export default cartRouter;