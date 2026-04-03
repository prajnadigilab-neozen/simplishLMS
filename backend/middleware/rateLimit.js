const rateLimit = require('express-rate-limit');

// General API limiter: max 500 requests per 15-minute window per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts from this IP. Please try again in 15 minutes.' },
    skip: (req) => process.env.NODE_ENV !== 'production' // Skip in dev
});

// 🛡️ Security Hardening: Strict Auth Limiter (Brute-Force Shield)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Strict limit for auth attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
    skip: (req) => process.env.NODE_ENV !== 'production'
});

module.exports = { apiLimiter, authLimiter };
