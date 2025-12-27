export default async function adminAuthMiddleware(req, res, next) {
    try {
        // Check if user exists on request (should be populated by authMiddleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Check if user has admin role
        if (req.user.role !== 'ADMIN') {
            return res.status(400).json({
                success: false,
                message: "Access denied. Admin privileges required."
            });
        }

        // User is admin, proceed to next middleware/controller
        next();
    } catch (error) {
        console.error('Error in admin auth middleware:', error);
        next(error);
    }
}
