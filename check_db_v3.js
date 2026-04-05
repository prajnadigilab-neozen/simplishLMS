const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('CHECKING TABLES...');
    
    // Check Settings
    const { data: st, error: se } = await supabase.from('settings').select('*');
    if (se) console.log('Settings Error:', se.message);
    else console.log('Settings:', st.length, 'rows');

    // Check Payments
    const { data: pt, error: pe } = await supabase.from('payments').select('*').limit(1);
    if (pe) console.log('Payments Error:', pe.message);
    else console.log('Payments:', pt.length, 'rows (Table Exists)');

    // Check Users
    const { data: ut, error: ue } = await supabase.from('users').select('id').limit(1);
    if (ue) console.log('Users Error:', ue.message);
    else console.log('Users:', ut.length, 'rows');
}

check();
