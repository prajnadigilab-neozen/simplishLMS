const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log('Checking database schema...');
    
    // Check payments table columns
    const { data: columns, error } = await supabase.rpc('get_table_columns', { table_name: 'payments' });
    
    if (error) {
        console.error('Error fetching columns via RPC:', error);
        // Fallback: try to select one row and check keys
        console.log('Falling back to sample row check...');
        const { data: sample, error: sampleError } = await supabase.from('payments').select('*').limit(1).maybeSingle();
        if (sampleError) {
            console.error('Error fetching sample row:', sampleError);
        } else if (sample) {
            console.log('Columns found in payments table:', Object.keys(sample));
        } else {
            console.log('No rows in payments table to check.');
        }
    } else {
        console.log('Columns in payments table:', columns);
    }

    // Check settings table
    const { data: settings, error: settingsError } = await supabase.from('settings').select('*');
    if (settingsError) {
        console.error('Error fetching settings:', settingsError);
    } else {
        console.log('Settings found:', settings);
    }
}

checkSchema();
