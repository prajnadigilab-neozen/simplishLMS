const fetch = require('node-fetch');

async function testFR09() {
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

    // 2. Fetch Summary Metrics
    console.log('\n--- Step 2: Fetch Summary Metrics ---');
    const response = await fetch(`${API_URL}/reports/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 403) {
        console.error('ERROR: 403 Forbidden. Ensure user is Super Admin.');
        return;
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    // 3. Validate FR-09 specific KPIs
    console.log('\n--- Step 3: Validate KPIs ---');
    const kpis = {
        'Total Revenue': data.totalRevenueAllTime !== undefined,
        'Registrations': data.totalUsers !== undefined,
        '30-day Avg DAU': data.avgDailyActive30d !== undefined
    };

    let allPassed = true;
    for (const [kpi, exists] of Object.entries(kpis)) {
        if (exists) {
            console.log(`PASS: ${kpi} is present (${data[kpi.includes('Revenue') ? 'totalRevenueAllTime' : kpi.includes('Registrations') ? 'totalUsers' : 'avgDailyActive30d']})`);
        } else {
            console.log(`FAIL: ${kpi} is missing from response`);
            allPassed = false;
        }
    }

    if (allPassed) {
        console.log('\nSUCCESS: FR-09 KPIs are live and monitoring is functional.');
    } else {
        console.log('\nFAILURE: One or more KPIs are missing.');
    }
}

testFR09().catch(err => {
    console.error('CRITICAL TEST ERROR:', err);
});
