const isAdmin = (req, res, next) => {
    const role = typeof req.user?.role === 'string' ? req.user.role.toLowerCase().replace(/\s+|_/g, '_') : 'user';
    if (req.user && (role === 'admin' || role === 'super_admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Admin permissions required' });
    }
};

module.exports = isAdmin;
