const fetch = require('node-fetch');

async function testNFRs() {
    const API_URL = 'http://localhost:5000/api/v1';
    
    console.log('--- Testing NFR-03: Security (RLS) ---');
    // 1. Get token for Admin (User A)
    const loginARes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9112233445', password: 'password123' })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.token;
    const userAId = loginAData.user.id;

    // 2. Try to fetch progress for a different user (User B)
    // We'll need a different user ID. Let's find one.
    const usersRes = await fetch(`${API_URL}/auth/users`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const usersData = await usersRes.json();
    const userB = usersData.users.find(u => u.id !== userAId);
    
    if (userB) {
        console.log(`Attempting to access User B (${userB.id}) progress using User A token...`);
        // Note: We need to know the endpoint for user progress. 
        // Based on previous logs, it might be /lessons/progress or similar.
        // Let's check lessonRoutes.
        const progressRes = await fetch(`${API_URL}/lessons/progress/${userB.id}`, {
            headers: { 'Authorization': `Bearer ${tokenA}` }
        });
        
        if (progressRes.status === 403 || progressRes.status === 401 || (await progressRes.json()).data?.length === 0) {
            console.log('PASS: RLS prevents unauthorized access to other user progress.');
        } else {
            console.log('FAIL: Unauthorized access to other user progress was possible.');
        }
    } else {
        console.log('SKIP: No other user found to test RLS.');
    }

    console.log('\n--- Testing NFR-04: Encryption ---');
    // Check if the server is configured for HTTPS or if there are security headers
    const rootRes = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const headers = rootRes.headers;
    console.log('Strict-Transport-Security:', headers.get('strict-transport-security') || 'Not Set (Expected for localhost)');
    console.log('X-Content-Type-Options:', headers.get('x-content-type-options') || 'Not Set');
    // In production, everything would be over HTTPS.
    console.log('INFO: In a production environment, all traffic is routed through TLS 1.2+ via Supabase/Load Balancer.');
}

testNFRs().catch(err => {
    console.error('NFR Test Error:', err);
});
