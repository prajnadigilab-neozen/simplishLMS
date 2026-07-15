const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const rateLimit = require('express-rate-limit');

// Rate limiter specifically for coupon validations (prevents coupon guessing brute force)
const couponValidationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 15, // Max 15 validation attempts per 5 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many coupon validation attempts. Please try again in 5 minutes.' },
    skip: (req) => process.env.NODE_ENV !== 'production' // Skip in development
});

/**
 * Public/User Endpoints (Authenticated)
 */
// Validate Coupon
router.post('/validate', authMiddleware, couponValidationLimiter, discountController.validateCoupon);

/**
 * Administrative Endpoints (Admin / Super Admin only)
 */
// List coupons
router.get('/', authMiddleware, isAdmin, discountController.getCoupons);

// Create coupon
router.post('/', authMiddleware, isAdmin, discountController.createCoupon);

// Bulk generate coupons
router.post('/generate', authMiddleware, isAdmin, discountController.generateBulk);

// Get analytics
router.get('/analytics', authMiddleware, isAdmin, discountController.getAnalytics);

// Get usage history
router.get('/history', authMiddleware, isAdmin, discountController.getHistory);

// Update coupon
router.put('/:id', authMiddleware, isAdmin, discountController.updateCoupon);

// Delete coupon
router.delete('/:id', authMiddleware, isAdmin, discountController.deleteCoupon);

// Toggle active/inactive status
router.post('/:id/toggle', authMiddleware, isAdmin, discountController.toggleCoupon);

// Clone coupon
router.post('/:id/clone', authMiddleware, isAdmin, discountController.cloneCoupon);

module.exports = router;
