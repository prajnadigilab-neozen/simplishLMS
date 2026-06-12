const { z } = require('zod');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
    GEMINI_API_KEY: z.string().optional(),
    
    // Auth & CORS
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    
    // Razorpay
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    
    // Optional CDN
    CDN_URL: z.string().url().optional().transform(url => url ? url.replace(/\/$/, '') : ''),

    // Sentry
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ENVIRONMENT: z.string().default('development'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
}

module.exports = result.data;
