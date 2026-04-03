const supabase = require('../config/supabase');

/**
 * [GET] /api/v1/settings
 * Fetches global platform settings (like subscription_price).
 * PUBLIC: Needed for the Payment page before login if applicable (though usually logged-in).
 */
exports.getSettings = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*');

        if (error) throw error;

        // Convert array to object for easier frontend consumption
        const settings = (data || []).reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        res.json(settings);
    } catch (error) {
        console.error('getSettings error:', error);
        res.status(500).json({ message: 'Error fetching platform settings' });
    }
};

/**
 * [PUT] /api/v1/settings
 * Updates global platform settings.
 * AUTH: Super Admin Only.
 */
exports.updateSettings = async (req, res) => {
    const { settings } = req.body; // Expects object: { key: value }
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

        const { error } = await supabase
            .from('settings')
            .upsert(updates, { onConflict: 'key' });

        if (error) throw error;

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('updateSettings error:', error);
        res.status(500).json({ message: 'Error updating platform settings' });
    }
};
