const billingService = require('../services/billingService');

/**
 * [GET] /api/v1/settings
 */
exports.getSettings = async (req, res) => {
    try {
        const settings = await billingService.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('getSettings error:', error);
        res.status(500).json({ message: 'Error fetching platform settings' });
    }
};

/**
 * [PUT] /api/v1/settings
 */
exports.updateSettings = async (req, res) => {
    const { settings } = req.body;
    const role = req.user?.role?.toLowerCase();

    if (role !== 'super_admin' && role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ message: 'Invalid settings format' });
    }

    try {
        const updates = Object.entries(settings).map(([key, value]) => ({
            key,
            value: String(value),
            updated_at: new Date().toISOString()
        }));

        await billingService.updateSettings(updates);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('updateSettings error:', error);
        res.status(500).json({ message: 'Error updating platform settings' });
    }
};
