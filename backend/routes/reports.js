const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const isSuperAdmin = require('../middleware/isSuperAdmin');

router.get('/summary', authMiddleware, isAdmin, reportController.getSummaryMetrics);
router.get('/activity', authMiddleware, isAdmin, reportController.getActivityDetails);
router.get('/daily', authMiddleware, isAdmin, reportController.getDailyReport);

module.exports = router;
