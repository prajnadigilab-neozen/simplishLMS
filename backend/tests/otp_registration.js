require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: "commonjs",
        moduleResolution: "node",
        ignoreDeprecations: "6.0"
    }
});

const request = require('supertest');
const app = require('../server');
const supabase = require('../config/supabase');
const assert = require('assert');

const TEST_PHONE = '9876543210';
const TEST_PHONE_NORMALIZED = '9876543210';
const TEST_NAME = 'Jane Doe';
const TEST_PASSWORD = 'SecurePassword123!';

async function cleanupUser() {
    try {
        const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('phone', TEST_PHONE_NORMALIZED)
            .maybeSingle();

        if (profile) {
            await supabase.from('user_progress').delete().eq('user_id', profile.id);
            await supabase.from('users').delete().eq('id', profile.id);
            await supabase.auth.admin.deleteUser(profile.id);
        }
    } catch (err) {
        console.warn('Cleanup error (ignored):', err.message);
    }
}

async function runTests() {
    console.log('==================================================');
    console.log(' SIMPLISH — OTP Registration Integration Tests');
    console.log('==================================================\n');

    try {
        console.log('Step 0: Cleaning up any old test records...');
        await cleanupUser();
        console.log('✓ Cleanup done.\n');

        // 1. Send OTP
        console.log('Step 1: Sending OTP...');
        const sendOtpRes = await request(app)
            .post('/api/v1/auth/send-otp')
            .send({
                phone: TEST_PHONE,
                fullName: TEST_NAME,
                password: TEST_PASSWORD
            });

        assert.strictEqual(sendOtpRes.status, 200);
        assert.ok(sendOtpRes.body.otp, 'Response should contain the OTP in development/test');
        console.log(`✓ OTP sent successfully! Received code: ${sendOtpRes.body.otp}\n`);
        const otpCode = sendOtpRes.body.otp;

        // 2. Try to register with invalid OTP
        console.log('Step 2: Testing registration with invalid OTP...');
        const invalidRegRes = await request(app)
            .post('/api/v1/auth/register')
            .send({
                fullName: TEST_NAME,
                phone: TEST_PHONE,
                password: TEST_PASSWORD,
                otp: '999999' // Invalid OTP
            });
        assert.strictEqual(invalidRegRes.status, 400);
        assert.strictEqual(invalidRegRes.body.message, 'Invalid OTP code.');
        console.log('✓ Registration correctly rejected for invalid OTP!\n');

        // 3. Register with correct OTP
        console.log('Step 3: Registering with correct OTP...');
        const registerRes = await request(app)
            .post('/api/v1/auth/register')
            .send({
                fullName: TEST_NAME,
                phone: TEST_PHONE,
                password: TEST_PASSWORD,
                otp: otpCode
            });
        assert.strictEqual(registerRes.status, 201);
        assert.strictEqual(registerRes.body.message, 'Registration successful.');
        console.log('✓ Registration completed successfully!\n');

        // 4. Verify login using the newly created account
        console.log('Step 4: Logging in with the registered credentials...');
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({
                phone: TEST_PHONE,
                password: TEST_PASSWORD
            });
        assert.strictEqual(loginRes.status, 200);
        assert.ok(loginRes.body.token, 'Login response should contain an auth token');
        assert.strictEqual(loginRes.body.user.phone, TEST_PHONE_NORMALIZED);
        console.log('✓ Login successful! Token received:', loginRes.body.token.substring(0, 15) + '...\n');

        // 5. Try to request OTP for already registered and confirmed number
        console.log('Step 5: Testing duplicate registration prevention...');
        const duplicateOtpRes = await request(app)
            .post('/api/v1/auth/send-otp')
            .send({
                phone: TEST_PHONE
            });
        assert.strictEqual(duplicateOtpRes.status, 422);
        assert.strictEqual(duplicateOtpRes.body.code, 'DUPLICATE_PHONE');
        console.log('✓ Duplicate registration blocked successfully!\n');

        console.log('Step 6: Cleaning up test records...');
        await cleanupUser();
        console.log('✓ Cleanup done.\n');

        console.log('==================================================');
        console.log(' 🎉 ALL OTP REGISTRATION INTEGRATION TESTS PASSED!');
        console.log('==================================================');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ TEST SUITE FAILED:', err);
        await cleanupUser();
        process.exit(1);
    }
}

runTests();
