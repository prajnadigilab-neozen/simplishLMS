const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const API_URL = 'http://localhost:5000/api/v1';

async function test() {
    console.log('Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9112233445', password: 'password123' })
    });
    console.log('Login Status:', loginRes.status);
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Token (exists):', !!token);

    console.log('Initiating payment...');
    const initRes = await fetch(`${API_URL}/billing/initiate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'MEMBERSHIP', amount: 99 })
    });
    console.log('Initiate Status:', initRes.status);
    const text = await initRes.text();
    console.log('Initiate Body:', text);
}

test().catch(console.error);
