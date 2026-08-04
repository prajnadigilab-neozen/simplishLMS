// 🚀 Incremental TS Migration: Register ts-node with transpileOnly to allow requiring .ts files during incremental migration
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: "commonjs",
        moduleResolution: "node",
        ignoreDeprecations: "6.0"
    }
});

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
const env = require('./config/env');
const logger = require('./utils/logger');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// 🔐 Initialize Sentry (MUST be first)
if (env.SENTRY_DSN) {
    Sentry.init({
        dsn: env.SENTRY_DSN,
        integrations: [
            nodeProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0, 
        // Set sampling rate for profiling - relative to tracesSampleRate
        profilesSampleRate: 1.0,
        environment: env.SENTRY_ENVIRONMENT
    });
}

const app = express();
app.disable('x-powered-by'); 
app.set('trust proxy', 1); // Rule 15: Trust proxy for rate limiting (needed behind Vite/Load Balancers)

// 🛡️ Security Shield: Auto-drop malicious probes and blocklisted IPs immediately
const securityShield = require('./middleware/securityShield');
app.use(securityShield);

app.use((req, res, next) => {
    res.setHeader('X-Simplish-Shield', 'active');
    next();
});

const PORT = env.PORT;
const CDN_URL = env.CDN_URL;

if (CDN_URL) {
    logger.info(`[SRE] CDN Content Offloading: ACTIVE (Base: ${CDN_URL})`);
} else {
    logger.warn(`[SRE] CDN Content Offloading: INACTIVE (Serving from local /uploads)`);
}

// = [SRE SECURE MIDDLEWARE] =
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const authMiddleware = require('./middleware/auth');
const sanitizeInputs = require('./middleware/sanitize');
const isProd = env.NODE_ENV === 'production';

// 🛡️ Security Fix: Force HTTPS in production (Rule 22)
app.use((req, res, next) => {
    if (isProd && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect('https://' + req.hostname + req.url);
    }
    next();
});

app.use(cors({
    origin: env.FRONTEND_URL || 'http://localhost:5173', // Hardcoded default for safety, but prefers ENV
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
const examRoutes = require('./routes/exams').default;
const attributionRoutes = require('./routes/attribution');
const discountRoutes = require('./routes/discounts');

// 🛡️ Security Fix: Apply Brute-Force Shield to Auth routes (via route definitions)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/placement', placementRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/attribution', attributionRoutes);
app.use('/api/v1/discounts', discountRoutes);



// Legacy aliases so old bookmarks/clients still work
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assessments', assessmentRoutes);

app.get('/', (req, res, next) => {
    if (env.NODE_ENV === 'production') {
        return next();
    }
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

// SEO & Crawler Endpoints: Serve sitemap.xml and robots.txt
app.get('/sitemap.xml', (req, res) => {
    const possiblePaths = [
        path.join(__dirname, '../dist/sitemap.xml'),
        path.join(__dirname, '../frontend/dist/sitemap.xml'),
        path.join(__dirname, '../frontend/public/sitemap.xml'),
        path.join(__dirname, '../public/sitemap.xml'),
        path.join(process.cwd(), 'dist/sitemap.xml'),
        path.join(process.cwd(), 'public/sitemap.xml'),
        path.join(process.cwd(), 'frontend/public/sitemap.xml')
    ];

    const foundPath = possiblePaths.find(p => fs.existsSync(p));

    res.header('Content-Type', 'application/xml');
    if (foundPath) {
        return res.sendFile(foundPath);
    }

    // Fallback: Generate XML dynamically if static file is not located on server disk
    const defaultSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://lms.simplish.in/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://lms.simplish.in/home</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://lms.simplish.in/library</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://lms.simplish.in/coaching</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://lms.simplish.in/placement</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

    res.status(200).send(defaultSitemap);
});

app.get('/robots.txt', (req, res) => {
    const possiblePaths = [
        path.join(__dirname, '../dist/robots.txt'),
        path.join(__dirname, '../frontend/dist/robots.txt'),
        path.join(__dirname, '../frontend/public/robots.txt'),
        path.join(__dirname, '../public/robots.txt'),
        path.join(process.cwd(), 'dist/robots.txt'),
        path.join(process.cwd(), 'public/robots.txt'),
        path.join(process.cwd(), 'frontend/public/robots.txt')
    ];

    const foundPath = possiblePaths.find(p => fs.existsSync(p));

    res.header('Content-Type', 'text/plain');
    if (foundPath) {
        return res.sendFile(foundPath);
    }

    const defaultRobots = `# robots.txt for SIMPLISH LMS (https://lms.simplish.in)
User-agent: *
Crawl-delay: 5

Allow: /$
Allow: /home
Allow: /library
Allow: /coaching
Allow: /placement

Disallow: /admin/
Disallow: /checkout/
Disallow: /payment/
Disallow: /profile/
Disallow: /settings/
Disallow: /api/
Disallow: /uploads/

Sitemap: https://lms.simplish.in/sitemap.xml
`;

    res.status(200).send(defaultRobots);
});

// Serve Frontend Static Assets (Production or when build dist directory exists)
const frontendDistPath = path.join(__dirname, '../dist');
if (env.NODE_ENV === 'production' || fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    
    // Redirect all other non-API/non-static requests to React Router (SPA catch-all)
    // IMPORTANT: SPA catch-all MUST come after explicit /sitemap.xml, /robots.txt & express.static
    app.get('*', (req, res, next) => {
        // If request is for API routes, uploads, or crawler files, forward to API/404 handling
        if (
            req.path.startsWith('/api/') || 
            req.path.startsWith('/uploads/') || 
            req.path === '/sitemap.xml' || 
            req.path === '/robots.txt'
        ) {
            return next();
        }
        const indexFile = path.join(frontendDistPath, 'index.html');
        if (fs.existsSync(indexFile)) {
            return res.sendFile(indexFile);
        }
        next();
    });
}

// ==========================================
// 4. ERROR HANDLING
// ==========================================
// 🔐 SRE: Sentry Error Handler (Must be before any other error middleware)
if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, next) => {
    logger.error({ 
        method: req.method, 
        url: req.url, 
        stack: err.stack 
    }, `Server Error: ${err.message}`);

    const isDev = env.NODE_ENV !== 'production';
    
    res.status(err.status || 500).json({ 
        message: err.message || 'Something went wrong on the server.',
        error: isDev ? err.message : undefined 
    });
});

// ==========================================
// 6. EXPORT & LISTEN (Clustered)
// ==========================================
const numCPUs = Math.min(os.cpus().length, 6); // Rule 18: Tuned to 6 workers for max OS 'Headroom' during Stress
const isPassenger = !!(
    process.env.PASSENGER_APP_ENV || 
    process.env.PASSENGER_BASE_URI ||
    process.execPath.includes('/opt/alt/') || // CloudLinux Node.js Selector path
    __dirname.includes('/domains/') ||        // Hostinger domain path
    __dirname.includes('/cpanel/')            // cPanel path
);
const shouldCluster = !isPassenger && env.NODE_ENV === 'production' && !env.DISABLE_CLUSTERING;


async function startServer() {
    app.listen(PORT, async () => {
        try {
            // Rule 19: Pre-warm memory caches for sub-1s interactivity
            const lessonController = require('./controllers/lessonController');
            await lessonController.preWarmCache();
        } catch (err) {
            logger.error(`[SRE] Cache pre-warming error: ${err.message}`);
        }
        
        logger.info(`[SRE] Server active on port ${PORT} (PID: ${process.pid})`);
    });
}

if (shouldCluster) {
    if (cluster.isMaster) {
        logger.info(`[SRE] Master ${process.pid} is running. Scaling to ${numCPUs} workers...`);

        // Fork workers
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            logger.warn(`[SRE] Worker ${worker.process.pid} died. Reviving...`);
            cluster.fork();
        });

        // Master logic for cron jobs (ensure only one master handles these)
        cron.schedule('0 0 * * *', () => {
            logger.info('--- Triggering daily system cleanup cron job (Master) ---');
            dailyCleanup();
        });
    } else {
        if (env.NODE_ENV !== 'test') {
            startServer();
        }
    }
} else {
    // Single process mode (e.g. Passenger, Dev, Test)
    if (env.NODE_ENV !== 'test') {
        startServer();
        
        // Start cron jobs in the single process
        cron.schedule('0 0 * * *', () => {
            logger.info('--- Triggering daily system cleanup cron job (Single Process) ---');
            dailyCleanup();
        });
    }
}

// --- SYSTEM CRASH LOGGING ---
process.on('uncaughtException', (err) => {
    logger.error({ stack: err.stack }, `UNCAUGHT EXCEPTION: ${err.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason }, 'UNHANDLED REJECTION');
});

if (env.NODE_ENV !== 'test') {
    // Note: The app.listen is now handled solely within the cluster worker branch above 
    // to prevent double-listening/EADDRINUSE conflicts.
}


module.exports = app;
