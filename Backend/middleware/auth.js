import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET;

export default async function authMiddleware(req, res, next) {
    const token = 
        req.cookies?.token ||
        (req.headers?.authorization?.startsWith('Bearer ')
            ? req.headers?.authorization?.split(' ')[1]
            : null);

    if (!token) {
        return res
            .status(401)
            .json({ success: false, message: 'Authentication token missing' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(payload.id).select('-password');

        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: 'User not found' });
        }
        req.user = user;
        req.userId = user._id;
        next();
    } 

    catch (error) {
        console.error('Error in auth middleware:', error);
        const message =error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        res.status(401).json({ success: false, message });
    }
}