const xss = require('xss');

/**
 * Robust XSS Sanitization Middleware
 * Uses the 'xss' library to strictly whitelist safe HTML elements and strip 
 * executable scripts and malicious attributes while preserving multi-language characters.
 */
const sanitizeInputs = (req, res, next) => {
    const sanitize = (val) => {
        if (typeof val !== 'string') return val;
        // Apply strict sanitization
        return xss(val);
    };

    if (req.body) {
        for (let key in req.body) {
            req.body[key] = sanitize(req.body[key]);
        }
    }
    
    if (req.query) {
        for (let key in req.query) {
            req.query[key] = sanitize(req.query[key]);
        }
    }

    next();
};

module.exports = sanitizeInputs;
