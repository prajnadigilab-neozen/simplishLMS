const axios = require('axios');

async function verifyAuthIntegrity() {
    console.log('--- SIMPLISH Session & Auth Management Audit ---');
    
    const BASE_URL = 'http://localhost:5000/api/v1';

    // 1. Broken Auth Test: Attempt to fetch lessons without a session
    console.log('\n[TEST 1] Broken Auth / BOLA Check: Accessing Curricula without Login...');
    try {
        const res = await axios.get(`${BASE_URL}/lessons`);
        if (res.status === 200) {
            console.log('❌ VULNERABILITY DETECTED: Lesson metadata & Media URLs are publicly accessible!');
            console.log(`(Retrieved ${res.data.lessons?.length} lessons anonymously)`);
        }
    } catch (err) {
        if (err.response?.status === 401) {
            console.log('✅ PASS: Lessons are protected behind authMiddleware.');
        } else {
            console.error('Unexpected error in Test 1:', err.message);
        }
    }

    // 2. Accessing user progress without session
    console.log('\n[TEST 2] Accessing User Progress without Login...');
    try {
        await axios.get(`${BASE_URL}/lessons/my-progress`);
    } catch (err) {
        if (err.response?.status === 401) {
            console.log('✅ PASS: Progress is strictly protected.');
        } else {
            console.error('❌ FAIL: Progress returned unexpected status:', err.response?.status);
        }
    }

    // 3. PII / Least Privilege Check: Admin endpoints
    console.log('\n[TEST 3] Accessing Admin Reports without Login...');
    try {
        await axios.get(`${BASE_URL}/reports/stats`);
    } catch (err) {
        if (err.response?.status === 401) {
            console.log('✅ PASS: Admin stats are strictly protected.');
        } else {
            console.error('❌ FAIL: Admin stats returned unexpected status:', err.response?.status);
        }
    }

    console.log('\n--- RECOMMENDATION ---');
    console.log('CRITICAL: Convert /api/v1/lessons to a protected route to prevent unauthenticated scraping of curriculum assets.');
}

verifyAuthIntegrity();
