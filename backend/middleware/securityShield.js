const env = require('../config/env');
const logger = require('../utils/logger');

// Parse blocked IPs from config
const blockedIps = env.BLOCKED_IPS 
    ? env.BLOCKED_IPS.split(',').map(ip => ip.trim()).filter(Boolean)
    : [];

/**
 * Express middleware to shield the server against malicious activity.
 * Drops connections from blocked IPs and WordPress scanner probes.
 */
const securityShield = (req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',')[0].trim() 
        : (req.ip || req.socket.remoteAddress);
    
    // 1. IP Blocklist check
    if (blockedIps.includes(clientIp)) {
        logger.warn({
            ip: clientIp,
            method: req.method,
            url: req.originalUrl || req.url
        }, `[Security] Security Shield: Blocked request from banned IP`);

        if (res.socket && !res.writableEnded) {
            res.socket.destroy();
        } else if (res.destroy) {
            res.destroy();
        }
        return;
    }

    // 2. WordPress probe check
    const url = (req.originalUrl || req.url || '').toLowerCase();
    const wpPatterns = [
        '/wp-admin',
        '/wp-login',
        'wp-config',
        '/wp-content',
        '/wp-includes',
        'xmlrpc.php',
        'wp-links-opml.php',
        'wp-mail.php',
        'wp-trackback.php'
    ];

    const isWpProbe = wpPatterns.some(pattern => url.includes(pattern));
    if (isWpProbe) {
        logger.warn({
            ip: clientIp,
            method: req.method,
            url: req.originalUrl || req.url
        }, `[Security] Security Shield: Blocked WordPress probe request`);

        if (res.socket && !res.writableEnded) {
            res.socket.destroy();
        } else if (res.destroy) {
            res.destroy();
        }
        return;
    }

    next();
};

module.exports = securityShield;
