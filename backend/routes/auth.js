const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const isSuperAdmin = require('../middleware/isSuperAdmin');
const upload = require('../middleware/upload');
const validateFile = require('../middleware/validateFile');
const { authLimiter } = require('../middleware/rateLimit');

// Public — both /register and /signup work so old clients don't break
router.post('/register', authLimiter, authController.register);
router.post('/signup', authLimiter, authController.register);  // alias
router.post('/login', authLimiter, authController.login);
router.post('/logout', authMiddleware, authController.logout);

// Protected
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, upload.single('avatar'), validateFile, userController.updateProfile);
router.delete('/me', authMiddleware, authController.deleteMe);

// Admin & Moderator
const isAdminOrMod = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role === 'super_admin' || role === 'moderator') return next();
    res.status(403).json({ message: 'Access Denied: Admins/Moderators only' });
};

router.get('/users', authMiddleware, isAdminOrMod, userController.getAllUsers);
router.put('/users/:id/status', authMiddleware, isAdminOrMod, userController.updateStatus);

// Super Admin Only
router.put('/users/:id/role', authMiddleware, isSuperAdmin, userController.updateRole);
router.delete('/users/:id', authMiddleware, isSuperAdmin, userController.deleteUser);
router.get('/logs', authMiddleware, isSuperAdmin, userController.getSystemLogs);

module.exports = router;
