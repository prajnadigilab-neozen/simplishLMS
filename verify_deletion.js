
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyDeletion(phone) {
    console.log(`Verifying deletion for phone: ${phone}...`);
    
    // Check public.users
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, phone')
        .or(`phone.eq.${phone},phone.eq.+91${phone}`)
        .maybeSingle();
    
    if (userError) {
        console.error('Error fetching user from public.users:', userError);
    } else if (user) {
        console.log('User STILL EXISTS in public.users:', user);
    } else {
        console.log('User PURGED from public.users.');
    }

    // Check auth.users
    const { data: listData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Error listing auth users:', authError);
    } else if (listData?.users) {
        const found = listData.users.find(u => u.phone === phone || u.phone === `+91${phone}`);
        if (found) {
            console.log('User STILL EXISTS in auth.users:', found.id);
        } else {
            console.log('User PURGED from auth.users (Supabase Admin).');
        }
    }
}

const phoneArg = process.argv[2];
if (phoneArg) {
    verifyDeletion(phoneArg);
} else {
    console.log('Please provide a phone number as an argument.');
}
