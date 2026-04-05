const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectTable() {
    const { data, error } = await supabase.from('payments').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Columns in payments:', Object.keys(data[0]));
    } else {
        console.log('No rows in payments to check columns.');
        // Try to insert a dummy record and check the error
        console.log('Attempting dummy insert...');
        const { error: insError } = await supabase.from('payments').insert([{
            user_id: 'invalid-id',
            amount: 0
        }]);
        console.log('Insert Error:', insError.message);
    }
}

inspectTable();
