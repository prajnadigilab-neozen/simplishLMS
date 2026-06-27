const request = require('supertest');
const app = require('../server');
const supabase = require('../config/supabase');
const assert = require('assert');

const TEST_PHONE = '9999999992';
const TEST_NAME = 'Delete Test User';
const TEST_PASSWORD = 'SecurePassword123!';

async function cleanupUser() {
    try {
        const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('phone', TEST_PHONE)
            .maybeSingle();

        if (profile) {
            await supabase.from('user_progress').delete().eq('user_id', profile.id);
            await supabase.from('users').delete().eq('id', profile.id);
            await supabase.auth.admin.deleteUser(profile.id);
        }
    } catch (err) {
        console.warn('Cleanup error:', err.message);
    }
}

async function runTest() {
    console.log('--- Testing GDPR /auth/me DELETE Endpoint ---');
    await cleanupUser();
    
    try {
        // 1. Send OTP
        console.log('Sending OTP...');
        const sendOtpRes = await request(app)
            .post('/api/v1/auth/send-otp')
            .send({
                phone: TEST_PHONE,
                fullName: TEST_NAME,
                password: TEST_PASSWORD
            });
            
        assert.strictEqual(sendOtpRes.status, 200);
        const otpCode = sendOtpRes.body.otp;
        console.log(`OTP received: ${otpCode}`);
        
        // 2. Register
        console.log('Registering user...');
        const registerRes = await request(app)
            .post('/api/v1/auth/register')
            .send({
                fullName: TEST_NAME,
                phone: TEST_PHONE,
                password: TEST_PASSWORD,
                otp: otpCode
            });
        assert.strictEqual(registerRes.status, 201);
        
        // 3. Login
        console.log('Logging in user...');
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({
                phone: TEST_PHONE,
                password: TEST_PASSWORD
            });
        assert.strictEqual(loginRes.status, 200);
        const token = loginRes.body.token;
        console.log('Logged in successfully, token obtained.');
        
        // 4. Call DELETE /api/v1/auth/me
        console.log('Calling DELETE /api/v1/auth/me...');
        const deleteRes = await request(app)
            .delete('/api/v1/auth/me')
            .set('Authorization', `Bearer ${token}`);
            
        console.log(`Response Status: ${deleteRes.status}`);
        console.log('Response Body:', deleteRes.body);
        
        assert.strictEqual(deleteRes.status, 200);
        console.log('✅ Success: User deleted successfully via endpoint!');
        
    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await cleanupUser();
        process.exit(0);
    }
}

runTest();
