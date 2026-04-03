const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifyRLS() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY; 

    if (!supabaseUrl || !anonKey) {
        console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
        return;
    }

    // --- STEP 1: LOGIN TO GET A USER JWT ---
    const fetch = require('node-fetch');
    const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': anonKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            phone: '9112233445', // Use a standard user/admin phone
            password: 'password123'
        })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    const myId = loginData.user.id;

    if (!token) {
        console.error('Failed to get user token:', loginData);
        return;
    }

    // --- STEP 2: INITIALIZE CLIENT WITH USER TOKEN (RESPECTS RLS) ---
    const userClient = createClient(supabaseUrl, anonKey, {
        global: {
            headers: { Authorization: `Bearer ${token}` }
        }
    });

    console.log('--- NFR-03: RLS Verification ---');
    console.log('Logged in as:', myId);

    // 1. Fetch own progress (should pass)
    const { data: myProgress, error: myError } = await userClient
        .from('user_progress')
        .select('*')
        .eq('user_id', myId);

    if (myError) {
        console.log('Error fetching own progress:', myError.message);
    } else {
        console.log('PASS: Successfully fetched own progress records:', myProgress?.length || 0);
    }

    // 2. Fetch someone else's progress (should fail/return 0 records due to RLS)
    // Find another user ID
    // We'll use the service role client just to FIND another ID
    const serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: otherUser } = await serviceClient
        .from('user_progress')
        .select('user_id')
        .neq('user_id', myId)
        .limit(1)
        .maybeSingle();

    if (otherUser) {
        console.log(`Checking RLS for target user: ${otherUser.user_id}...`);
        const { data: stolenProgress, error: stolenError } = await userClient
            .from('user_progress')
            .select('*')
            .eq('user_id', otherUser.user_id);

        if (stolenError) {
            console.log('PASS: RLS prevented access (Error):', stolenError.message);
        } else if (stolenProgress && stolenProgress.length === 0) {
            console.log('PASS: RLS prevented access (Returned 0 rows for other user)');
        } else {
            console.log('FAIL: RLS leaked user progress for another account.');
        }
    } else {
        console.log('SKIP: No other user progress found to test RLS leaks.');
    }
}

verifyRLS().catch(err => {
    console.error('RLS Verify Error:', err);
});
