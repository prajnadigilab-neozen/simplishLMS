const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const dailyCleanup = require('./scripts/dailyCleanup');
const compression = require('compression');
const helmet = require('helmet');
const cluster = require('cluster');
const os = require('os');
const http = require('http');

// 🛡️ SRE Optimization: Enable global HTTP Keep-Alive for 10x throughput
http.globalAgent.keepAlive = true;
http.globalAgent.maxSockets = 1000;
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ==========================================
// 1. STARTUP — Validate Required Env Vars
// ==========================================
// Crash fast if critical config is missing so we know immediately at startup
// rather than getting cryptic errors on the first request.
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
REQUIRED_ENV.forEach(key => {
    if (!process.env[key]) {
        console.error(`FATAL: Missing required environment variable: ${key}`);
        process.exit(1);
    }
});

const app = express();
app.disable('x-powered-by'); 
app.set('trust proxy', 1); // Rule 15: Trust proxy for rate limiting (needed behind Vite/Load Balancers)
app.use((req, res, next) => {
    res.setHeader('X-Simplish-Shield', 'active');
    next();
});
const PORT = (process.env.PORT || '5000').toString().trim();
const CDN_URL = process.env.CDN_URL ? process.env.CDN_URL.replace(/\/$/, '') : ''; // Guard: Ensure no trailing slash

if (CDN_URL) {
    console.log(`[SRE] CDN Content Offloading: ACTIVE (Base: ${CDN_URL})`);
} else {
    console.warn(`[SRE] CDN Content Offloading: INACTIVE (Serving from local /uploads)`);
}

// = [SRE SECURE MIDDLEWARE] =
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const authMiddleware = require('./middleware/auth');
const sanitizeInputs = require('./middleware/sanitize');
const isProd = process.env.NODE_ENV === 'production';

// 🛡️ Security Fix: Force HTTPS in production (Rule 22)
app.use((req, res, next) => {
    if (isProd && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect('https://' + req.hostname + req.url);
    }
    next();
});

app.use(cors({
    origin: process.env.FRONTEND_URL?.trim() || 'http://localhost:5173', // Hardcoded default for safety, but prefers ENV
    credentials: true
}));
// app.use('/api/', apiLimiter); // Temporarily disabled to unblock development 429 loops

// 🛡️ Security Fix: Enhanced Helmet Configuration (Rule 23)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.razorpay.com", "'unsafe-inline'"], // Allow Razorpay 3DS logic
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://*.supabase.co", "https://*.razorpay.com", CDN_URL || "'self'"],
            connectSrc: ["'self'", "https://*.supabase.co", "https://api.razorpay.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year (SSL/TLS Checklist requirement)
        includeSubDomains: true,
        preload: true,
        setIf: () => true // 🛡️ Audit: Force header even on internal HTTP dev for regression testing
    },
    hidePoweredBy: false, // 🛡️ Security: We manage our own identifier (SIMPLISH-SHIELD)
    crossOriginEmbedderPolicy: false // Required for cross-origin media/images from Supabase CDN
}));
app.use(compression());
app.use(cookieParser());
app.use(morgan('dev'));

// 🛡️ Security Fix: Global XSS Sanitization (Bilingual-safe)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInputs);

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Special raw parser for Razorpay Webhooks (needed for signature verification)
// Sanitized billing webhook raw parser
app.post('/api/v1/billing/internal-webhook', express.raw({ type: 'application/json' }));

// ==========================================
// 3. ROUTES  (versioned under /api/v1)
// ==========================================
const authRoutes = require('./routes/auth');
const lessonRoutes = require('./routes/lessons');
const assessmentRoutes = require('./routes/assessments');
const aiRoutes = require('./routes/ai');
const placementRoutes = require('./routes/placement');
const reportRoutes = require('./routes/reports');
const billingRoutes = require('./routes/billing');
const settingsRoutes = require('./routes/settings');

// 🛡️ Security Fix: Apply Brute-Force Shield to Auth routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/placement', placementRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/settings', settingsRoutes);

// Legacy aliases so old bookmarks/clients still work
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assessments', assessmentRoutes);

app.get('/', (req, res) => {
    res.setHeader('X-Simplish-Shield', 'active');
    res.json({ message: 'SIMPLISH LMS API is running', version: 'v1' });
});

// Serve uploaded static files — force PDFs inline so browsers embed them
// SECURITY: Non-media files (like PDFs) are secured with authMiddleware.
// Media (audio/images) are allowed for GET to support native browser tags (<audio>, <img>).
app.use('/uploads', (req, res, next) => {
    const isMedia = /\.(wav|mp3|ogg|png|jpg|jpeg|gif|webp|svg)$/i.test(req.path);
    if (isMedia && req.method === 'GET') {
        return next();
    }
    authMiddleware(req, res, next);
}, (req, res, next) => {
    if (req.path.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
    }
    next();
}, express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d', // Rule 17: Cache media for 1 day
    etag: true,
    lastModified: true
}));

// ==========================================
// 4. ERROR HANDLING
// ==========================================
app.use((err, req, res, next) => {
    try {
        const errorLog = `[${new Date().toISOString()}] ${req.method} ${req.url} - ${err.stack}\n`;
        fs.appendFileSync('error.log', errorLog);
    } catch (logErr) {
        // Fallback: Don't let a logging failure crash the entire server process!
        console.error('CRITICAL: Failed to write to error.log (Permissions? Room?):', logErr.message);
    }

    if (process.env.NODE_ENV !== 'production') {
        console.error('SERVER ERROR:', err.message);
        console.error('PATH:', req.url);
        console.error(err.stack);
    }
    
    res.status(err.status || 500).json({ 
        message: err.message || 'Something went wrong on the server.',
        error: process.env.NODE_ENV !== 'production' ? err.message : undefined 
    });
});

// ==========================================
// 6. EXPORT & LISTEN (Clustered)
// ==========================================
const numCPUs = Math.min(os.cpus().length, 6); // Rule 18: Tuned to 6 workers for max OS 'Headroom' during Stress

if (cluster.isMaster) {
    console.log(`[SRE] Master ${process.pid} is running. Scaling to ${numCPUs} workers...`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.warn(`[SRE] Worker ${worker.process.pid} died. Reviving...`);
        cluster.fork();
    });

    // Master logic for cron jobs (ensure only one master handles these)
    cron.schedule('0 0 * * *', () => {
        console.log('--- Triggering daily system cleanup cron job (Master) ---');
        dailyCleanup();
    });
} else {
    // Workers share the same TCP connection on port 5000
    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, async () => {
            // Rule 19: Pre-warm memory caches for sub-1s interactivity
            const lessonController = require('./controllers/lessonController');
            await lessonController.preWarmCache();
            
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[SRE] Worker ${process.pid} active on port ${PORT}`);
            }
        });
    }
}

// --- SYSTEM CRASH LOGGING ---
process.on('uncaughtException', (err) => {
    const log = `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}\n`;
    try { fs.appendFileSync('error.log', log); } catch (e) {}
    console.error(log);
});

process.on('unhandledRejection', (reason, promise) => {
    const log = `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`;
    try { fs.appendFileSync('error.log', log); } catch (e) {}
    console.error(log);
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Server running on port ${PORT}`);
            console.log(`API available at: http://localhost:${PORT}/api/v1`);
        }
    });
}


module.exports = app;
