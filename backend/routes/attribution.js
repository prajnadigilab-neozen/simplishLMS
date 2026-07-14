const express = require('express');
const router = express.Router();
const attributionController = require('../controllers/attributionController');
const { authLimiter } = require('../middleware/rateLimit');

const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// Public route to log web click download intent
router.post('/click-log', authLimiter, attributionController.logClick);

// Public route called by app on first open
router.post('/app-init', authLimiter, attributionController.initApp);

// Admin-only route to view click logs
router.get('/logs', authMiddleware, isAdmin, attributionController.getLogs);

module.exports = router;
