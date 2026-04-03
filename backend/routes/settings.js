const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');
const isSuperAdmin = require('../middleware/isSuperAdmin');

/**
 * [GET] /api/v1/settings 
 * Allowing all authenticated users to fetch platform settings (price, topups, etc.)
 */
router.get('/', authMiddleware, settingsController.getSettings);

/**
 * [PUT] /api/v1/settings 
 * Restricted to Super Admin for updates
 */
router.put('/', authMiddleware, isSuperAdmin, settingsController.updateSettings);

module.exports = router;
