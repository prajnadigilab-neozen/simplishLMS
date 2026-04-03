const fetch = require('node-fetch');

async function testFR08() {
    const API_URL = 'http://localhost:5000/api/v1';
    
    // 1. Login to get token
    console.log('--- Step 1: Login ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9112233445', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login success:', !!token);

    // 2. Initiate MEMBERSHIP purchase
    console.log('\n--- Step 2: Initiate MEMBERSHIP ---');
    const initiateMemRes = await fetch(`${API_URL}/billing/initiate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'MEMBERSHIP', amount: 99 })
    });
    const memData = await initiateMemRes.json();
    console.log('Initiate membership success:', memData.message);
    const memToken = memData.entry.id;

    // 3. Confirm MEMBERSHIP (mock)
    console.log('\n--- Step 3: Confirm MEMBERSHIP ---');
    const confirmMemRes = await fetch(`${API_URL}/billing/confirm`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            sync_id: memToken, 
            entry_id: 'mock_payment_mem', 
            signature: 'mock_sig' 
        })
    });
    const confirmMemData = await confirmMemRes.json();
    console.log('Confirm membership result:', confirmMemData.message);

    // 4. Initiate TOPUP purchase
    console.log('\n--- Step 4: Initiate TOPUP ---');
    const initiateTopupRes = await fetch(`${API_URL}/billing/initiate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'TOPUP', amount: 100 })
    });
    const topupData = await initiateTopupRes.json();
    console.log('Initiate topup success:', topupData.message);
    const topupToken = topupData.entry.id;

    // 5. Confirm TOPUP (mock)
    console.log('\n--- Step 5: Confirm TOPUP ---');
    const confirmTopupRes = await fetch(`${API_URL}/billing/confirm`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            sync_id: topupToken, 
            entry_id: 'mock_payment_topup', 
            signature: 'mock_sig' 
        })
    });
    const confirmTopupData = await confirmTopupRes.json();
    console.log('Confirm topup result:', confirmTopupData.message);

    // 6. Check final status
    console.log('\n--- Step 6: Verify Persistence ---');
    // We'll use the profile endpoint or another one
    const profileRes = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const profileData = await profileRes.json();
    const user = profileData.user;
    
    console.log('Final Result:');
    console.log('- Wallet Balance:', user.wallet_balance || 0);
    console.log('- Subscription Expires At:', user.subscription_expires_at);
    console.log('- Is Paid:', user.is_paid);
}

testFR08().catch(err => {
    console.error('CRITICAL TEST ERROR:', err);
});
