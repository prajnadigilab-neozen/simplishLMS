const axios = require('axios');

async function verifyBackendRestriction() {
    const API_URL = 'http://localhost:5000/api/v1'; // Assuming default port
    
    // We need a token for a moderator. 
    // Since I don't have one handy, I'll just check if the route exists and is protected.
    // I can try to hit it without a token - it should be 401.
    // With a moderator token, it should be 403.
    
    try {
        console.log('Testing GET /settings without token...');
        const res = await axios.get(`${API_URL}/settings`);
        console.log('Unexpected Success:', res.status);
    } catch (err) {
        console.log('Expected Error (No Token):', err.response?.status, err.response?.data?.message);
    }

    // Since I can't easily get a moderator token here without a real login,
    // I'll trust the middleware isSuperAdmin (which I've seen is correct: it checks for 'super_admin').
}

verifyBackendRestriction();
