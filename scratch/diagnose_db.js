const supabase = require('./backend/config/supabase');
async function diagnose() {
    console.log('--- DB DIAGNOSTIC ---');
    
    // 1. Check payments table columns
    const { data: cols, error: e1 } = await supabase.rpc('get_table_columns', { table_name: 'payments' });
    if (e1) {
        // If RPC doesn't exist, try raw select on information_schema (if allowed)
        console.error('RPC get_table_columns failed, trying raw query...');
        const { data: raw, error: e2 } = await supabase.from('payments').select('*').limit(1);
        if (e2) {
            console.error('Raw query failed:', e2.message);
        } else {
            console.log('Detected Columns:', Object.keys(raw[0] || {}));
        }
    } else {
        console.log('Columns:', cols);
    }

    // 2. Check if revenue_summary exists and works
    const { data: rev, error: e3 } = await supabase.from('revenue_summary').select('*').limit(1);
    if (e3) {
        console.error('revenue_summary error:', e3.message);
    } else {
        console.log('revenue_summary works!');
    }
}
diagnose();
