const { z } = require('zod');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const emptyToUndefined = (schema) => z.preprocess((val) => (val === '' ? undefined : val), schema);

const envSchema = z.object({
    PORT: z.preprocess(
        (val) => {
            if (val === undefined || val === '') return 5000;
            return /^\d+$/.test(String(val)) ? Number(val) : val;
        },
        z.union([z.number(), z.string()])
    ),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    
    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
    
    // AI
    GEMINI_API_KEY: emptyToUndefined(z.string().optional()),
    
    FRONTEND_URL: emptyToUndefined(
        z.preprocess((val) => {
            if (typeof val !== 'string') return val;
            let url = val.trim();
            if (url === '/' || url === '') return 'https://simplish.in';
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            return url;
        }, z.string().url().default('http://localhost:5173'))
    ),
    
    // Razorpay
    RAZORPAY_KEY_ID: emptyToUndefined(z.string().optional()),
    RAZORPAY_KEY_SECRET: emptyToUndefined(z.string().optional()),
    RAZORPAY_WEBHOOK_SECRET: emptyToUndefined(z.string().optional()),
    
    // Optional CDN
    CDN_URL: emptyToUndefined(z.string().url().optional()).transform(url => url ? url.replace(/\/$/, '') : ''),

    // Sentry
    SENTRY_DSN: emptyToUndefined(z.string().url().optional()),
    SENTRY_ENVIRONMENT: z.string().default('development'),

    // Clustering
    DISABLE_CLUSTERING: emptyToUndefined(
        z.preprocess(
            (val) => val === 'true' || val === '1' || val === true,
            z.boolean().default(false)
        )
    ),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    const errorDetails = JSON.stringify(result.error.format(), null, 2);
    console.error('❌ Invalid environment variables:', errorDetails);
    
    try {
        const fs = require('fs');
        const logPath = path.join(__dirname, '../../debug-crash.txt');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ZOD VALIDATION FAILED:\n${errorDetails}\n\n`);
    } catch (e) {
        // Safe fallback
    }
    
    process.exit(1);
}

module.exports = result.data;
