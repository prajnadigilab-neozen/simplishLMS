const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const dailyCleanup = require('./scripts/dailyCleanup');
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
app.set('trust proxy', 1); // Rule 15: Trust proxy for rate limiting (needed behind Vite/Load Balancers)
const PORT = (process.env.PORT || '5000').toString().trim();

// ==========================================
// 2. MIDDLEWARE
// ==========================================
const apiLimiter = require('./middleware/rateLimit');
const authMiddleware = require('./middleware/auth');

app.use(cors({
    origin: process.env.FRONTEND_URL?.trim() || 'http://localhost:5173', // Hardcoded default for safety, but prefers ENV
    credentials: true
}));
// app.use('/api/', apiLimiter); // Temporarily disabled to unblock development 429 loops
app.use(cookieParser());
app.use(morgan('dev'));

// Special raw parser for Razorpay Webhooks (needed for signature verification)
// Sanitized billing webhook raw parser
app.post('/api/v1/billing/internal-webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

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

app.use('/api/v1/auth', authRoutes);
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
}, express.static(path.join(__dirname, 'uploads')));

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
// 5. SCHEDULED TASKS (CRON JOBS)
// ==========================================
// Schedule the cleanup script to run every day at Midnight (00:00)
cron.schedule('0 0 * * *', () => {
    console.log('--- Triggering daily system cleanup cron job ---');
    dailyCleanup();
});

// ==========================================
// 6. EXPORT & LISTEN
// ==========================================
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
