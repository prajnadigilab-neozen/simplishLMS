const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authMiddleware = require('../middleware/auth');

/**
 * [POST] /api/v1/billing/initiate 
 */
router.post('/initiate', authMiddleware, billingController.initiate);

/**
 * [POST] /api/v1/billing/confirm
 */
router.post('/confirm', authMiddleware, billingController.confirm);

/**
 * [GET] /api/v1/billing/history
 */
router.get('/history', authMiddleware, billingController.getHistory);

/**
 * [POST] /api/v1/billing/refund
 */
router.post('/refund', authMiddleware, billingController.processRefund);

/**
 * [POST] /api/v1/billing/internal-webhook
 */
router.post('/internal-webhook', express.raw({ type: 'application/json' }), billingController.processInternal);

module.exports = router;
