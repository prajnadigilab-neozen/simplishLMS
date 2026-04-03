const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log('--- Verifying Database State ---');
    
    // Check settings table
    const { data: settings, error: settingsError } = await supabase.from('settings').select('*');
    if (settingsError) {
        console.error('Error fetching settings:', settingsError);
    } else {
        console.log('Settings found:', JSON.stringify(settings, null, 2));
    }

    // Check payments table structure by fetching one record
    const { data: payment, error: paymentError } = await supabase.from('payments').select('*').limit(1).maybeSingle();
    if (paymentError) {
        console.error('Error fetching payment row:', paymentError);
        // If it fails with "column does not exist", it might be because of a previous bad query
        // Let's try to just get IDs
        const { data: ids, error: idError } = await supabase.from('payments').select('id').limit(1);
        if (idError) console.error('Error selecting id from payments:', idError);
        else console.log('Payments table exists (id found)');
    } else if (payment) {
        console.log('Columns in payments table:', Object.keys(payment));
    } else {
        console.log('Payments table is empty, but exists.');
        // Try to insert a dummy row to see what columns are expected? 
        // No, let's try a different RPC or query information_schema if possible
        const { data: info, error: infoError } = await supabase.rpc('inspect_table', { tablename: 'payments' });
        if (infoError) console.log('inspect_table RPC not available');
        else console.log('Table info:', info);
    }
}

checkSchema();
