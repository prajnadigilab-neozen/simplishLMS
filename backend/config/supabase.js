const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing. Supabase features will be disabled.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    },
    global: {
        headers: { 'x-application-name': 'simplish-lms-sre' },
        fetch: (url, options) => {
            return fetch(url, {
                ...options,
                signal: AbortSignal.timeout(15000) // Rule 20: 15s Hard timeout for database calls during Stress
            });
        }
    }
});

module.exports = supabase;
