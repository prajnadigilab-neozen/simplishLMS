const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const isSuperAdmin = require('../middleware/isSuperAdmin');
const upload = require('../middleware/upload');
const validateFile = require('../middleware/validateFile');
const { authLimiter } = require('../middleware/rateLimit');

// Public — both /register and /signup work so old clients don't break
router.post('/send-otp', authLimiter, authController.sendOtp);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/register', authLimiter, authController.register);
router.post('/signup', authLimiter, authController.register);  // alias
router.post('/login', authLimiter, authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, upload.single('avatar'), validateFile, userController.updateProfile);
router.delete('/me', authMiddleware, authController.deleteMe);

// Admin, Moderator & Super Admin access
router.get('/users', authMiddleware, isAdmin, userController.getAllUsers);
router.put('/users/:id/status', authMiddleware, isAdmin, userController.updateStatus);

// Super Admin Only
router.put('/users/:id/role', authMiddleware, isSuperAdmin, userController.updateRole);
router.delete('/users/:id', authMiddleware, isSuperAdmin, userController.deleteUser);
router.get('/logs', authMiddleware, isSuperAdmin, userController.getSystemLogs);

module.exports = router;
