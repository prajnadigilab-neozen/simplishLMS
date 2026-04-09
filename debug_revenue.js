const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugRevenue() {
    console.log('\n====== REVENUE DIAGNOSTIC ======\n');

    // 1. All payments (any status)
    const { data: allPayments, error: e1 } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, payment_type, provider')
        .order('created_at', { ascending: false })
        .limit(20);

    if (e1) { console.error('ERROR fetching payments:', e1.message); return; }

    console.log(`[1] Total payments found (last 20): ${allPayments?.length ?? 0}`);
    (allPayments || []).forEach(p => {
        console.log(`   id=${p.id?.substring(0,8)} amount=${p.amount} status=${p.status} type=${p.payment_type} date=${p.created_at?.split('T')[0]}`);
    });

    // 2. Specifically 'completed' status
    const { data: completedPayments, error: e2 } = await supabase
        .from('payments')
        .select('id, amount, status, created_at')
        .eq('status', 'completed');

    if (e2) { console.error('ERROR fetching completed payments:', e2.message); }
    console.log(`\n[2] Payments with status='completed': ${completedPayments?.length ?? 0}`);
    if (completedPayments?.length > 0) {
        const total = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
        console.log(`   Total Revenue from completed: ${total}`);
    }

    // 3. Check all distinct statuses
    const { data: statusGroups, error: e3 } = await supabase
        .from('payments')
        .select('status, amount');

    if (!e3 && statusGroups) {
        const grouped = {};
        statusGroups.forEach(p => {
            grouped[p.status] = grouped[p.status] || { count: 0, total: 0 };
            grouped[p.status].count++;
            grouped[p.status].total += Number(p.amount);
        });
        console.log('\n[3] Payments by status:');
        Object.entries(grouped).forEach(([status, data]) => {
            console.log(`   status='${status}' count=${data.count} total_amount=${data.total}`);
        });
    } else if (e3) {
        console.error('ERROR fetching status groups:', e3.message);
    }

    // 4. Test what reportService would return for canSeeRevenue=true (all time)
    const { data: revenueAllTime, error: e4 } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed');

    if (e4) {
        console.error('\n[4] ERROR running revenue allTime query:', e4.message);
    } else {
        const totalAllTime = (revenueAllTime || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        console.log(`\n[4] Revenue allTime query result: ${revenueAllTime?.length} rows, total = ${totalAllTime}`);
    }

    // 5. Check if 'amount' field in completed payments has the right format
    console.log('\n[5] Sample amount values (raw type check):');
    const { data: sample } = await supabase.from('payments').select('amount, status').limit(5);
    (sample || []).forEach(p => console.log(`   amount=${JSON.stringify(p.amount)} (typeof: ${typeof p.amount}) status=${p.status}`));

    console.log('\n====== END DIAGNOSTIC ======\n');
}

debugRevenue().catch(console.error);
