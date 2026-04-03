/**
 * Simple XSS Sanitization Middleware
 * Strips <script> tags and common event handlers while preserving 
 * multi-language characters (Kannada/UTF-8).
 */
const sanitizeInputs = (req, res, next) => {
    const sanitize = (val) => {
        if (typeof val !== 'string') return val;
        
        // Remove <script> tags and common event handlers
        return val
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/on\w+="[^"]*"/gim, "")
            .replace(/on\w+='[^']*'/gim, "");
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
