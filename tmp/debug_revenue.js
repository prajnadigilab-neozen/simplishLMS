const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugRevenueFlow() {
    console.log('--- DEBUGGING REVENUE FLOW ---');
    
    // 1. Check User 9686098582
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', '9686098582')
        .single();
    
    if (userError) {
        console.error('User Fetch Error:', userError);
    } else {
        console.log('User Profile:', {
            id: userData.id,
            phone: userData.phone,
            role: userData.role,
            raw_role: userData.role // This is what comes from the DB
        });
    }

    // 2. Check Payments Statuses
    const { data: statusCounts, error: statusError } = await supabase
        .from('payments')
        .select('status');
    
    if (statusError) {
        console.error('Payments Status Error:', statusError);
    } else {
        const counts = {};
        statusCounts.forEach(p => {
            counts[p.status] = (counts[p.status] || 0) + 1;
        });
        console.log('Payment Status Counts:', counts);
    }

    // 3. Check Recent Payments
    const { data: recentPayments, error: payError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (payError) {
        console.error('Payments Fetch Error:', payError);
    } else {
        console.log('Recent Payments:', JSON.stringify(recentPayments, null, 2));
    }
}

debugRevenueFlow();
