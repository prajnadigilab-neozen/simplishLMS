const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Logs the click/download intent from the web frontend.
 */
exports.logClick = async (req, res) => {
    const { utm_source, utm_medium, utm_campaign, screen_resolution } = req.body;
    const userAgent = req.headers['user-agent'] || 'unknown';
    // Get IP, considering proxies
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket.remoteAddress;

    try {
        logger.info({ ipAddress, utm_source }, '[Attribution] Logging web click event');

        const { data, error } = await supabase
            .from('pending_attributions')
            .insert({
                ip_address: ipAddress,
                user_agent: userAgent,
                utm_source: utm_source || 'direct',
                utm_medium: utm_medium || 'direct-download',
                utm_campaign: utm_campaign || 'apk_campaign',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Click log captured successfully.' });
    } catch (err) {
        logger.error({ err }, 'Error logging click attribution');
        // Fail silently or gracefully return 200/500 depending on audit requirements.
        // Usually, we don't want tracking failures to block user UX.
        return res.status(200).json({ success: false, message: 'Failed to capture click log.' });
    }
};

/**
 * Handshake called by the app on first open to discover its campaign attribution.
 */
exports.initApp = async (req, res) => {
    const { user_agent, screen_resolution } = req.body;
    const appIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket.remoteAddress;

    try {
        logger.info({ appIp }, '[Attribution] App handshake request received');

        // Look back 2 hours (120 minutes)
        const timeLimit = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        // Query the pending attributions table for matching IP
        const { data: matches, error } = await supabase
            .from('pending_attributions')
            .select('*')
            .eq('ip_address', appIp)
            .gte('created_at', timeLimit)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (matches && matches.length > 0) {
            // Match based on IP (and optionally User-Agent similarity if available)
            let matchedRecord = matches[0]; // fallback to most recent

            // Try to match based on user_agent details
            if (user_agent) {
                const found = matches.find(m => m.user_agent === user_agent);
                if (found) {
                    matchedRecord = found;
                }
            }

            logger.info({ appIp, campaign: matchedRecord.utm_campaign }, '[Attribution] Successful match found');

            return res.status(200).json({
                success: true,
                matched: true,
                utm_source: matchedRecord.utm_source,
                utm_medium: matchedRecord.utm_medium,
                utm_campaign: matchedRecord.utm_campaign
            });
        }

        logger.info({ appIp }, '[Attribution] No match found. Defaulting to organic');
        return res.status(200).json({
            success: true,
            matched: false,
            utm_source: 'organic_apk',
            utm_medium: 'direct-sideload',
            utm_campaign: 'none'
        });
    } catch (err) {
        logger.error({ err }, 'Error in app init attribution handshake');
        return res.status(200).json({
            success: false,
            matched: false,
            utm_source: 'organic_apk_error',
            utm_medium: 'direct-sideload',
            utm_campaign: 'none'
        });
    }
};

/**
 * Fetches recent attribution click logs. Accessible by Admin only.
 */
exports.getLogs = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pending_attributions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return res.status(200).json(data);
    } catch (err) {
        logger.error({ err }, 'Error fetching attribution logs');
        return res.status(500).json({ message: 'Error fetching attribution logs.' });
    }
};
