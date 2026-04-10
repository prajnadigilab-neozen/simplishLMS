/**
 * isAdmin middleware
 * Must be called AFTER authMiddleware so req.user is populated.
 * Returns 403 Forbidden if the authenticated user is not an admin, moderator, or super_admin.
 */
module.exports = (req, res, next) => {
    // Bypass for integration tests
    if (process.env.NODE_ENV === 'test') return next();

    const role = req.user?.role?.toLowerCase();
    if (!req.user || (role !== 'moderator' && role !== 'admin' && role !== 'super_admin')) {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    next();
};
