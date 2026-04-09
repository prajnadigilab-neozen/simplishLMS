const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');
const isSuperAdmin = require('../middleware/isSuperAdmin');

// Custom middleware: Staff only (admin/moderator/super_admin)
const isStaff = (req, res, next) => {
    const role = req.user?.role;
    if (role === 'super_admin' || role === 'moderator' || role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden: Access restricted to Staff (Admin/Moderator)' });
};

router.get('/summary', authMiddleware, isStaff, reportController.getSummaryMetrics);
router.get('/activity', authMiddleware, isStaff, reportController.getActivityDetails);
router.get('/daily', authMiddleware, isStaff, reportController.getDailyReport);

module.exports = router;
