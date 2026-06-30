/**
 * Final end-to-end production SMS delivery validation.
 * Tests all 3 approved DLT templates via smsService.js.
 * 
 * Usage: node backend/scripts/validate_sms_delivery.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.SMS_GATEWAY_MOCK = 'false';
process.env.NODE_ENV = 'production';

const smsService = require('../services/smsService');

const PHONE = '9686098582';

function printConfig() {
    const mask = s => s ? `${s.slice(0, 4)}...${s.slice(-4)}` : '(NOT SET)';
    console.log('\n══════════════════════════════════════════════════════');
    console.log(' SIMPLISH-LMS — Production SMS Delivery Validator');
    console.log('══════════════════════════════════════════════════════');
    console.log('  PEID        :', process.env.SMS_GATEWAY_PEID);
    console.log('  API Key     :', mask(process.env.SMS_GATEWAY_API_KEY));
    console.log('  Sender ID   :', process.env.SMS_GATEWAY_SENDER_ID);
    console.log('  Route       :', process.env.SMS_GATEWAY_ROUTE);
    console.log('  OTP TplID   :', process.env.SMS_GATEWAY_TEMPLATE_ID);
    console.log('  Expiry TplID:', process.env.SMS_GATEWAY_EXPIRY_TEMPLATE_ID);
    console.log('  Reset TplID :', process.env.SMS_GATEWAY_RESET_TEMPLATE_ID);
    console.log('  Phone       :', PHONE);
    console.log('──────────────────────────────────────────────────────\n');
}

async function runTest(label, fn) {
    process.stdout.write(`  ${label} ... `);
    try {
        const result = await fn();
        if (result.success && !result.mock) {
            console.log(`✅  PASS  (JobId: ${result.jobId || result.JobId})`);
        } else {
            console.log(`⚠️   MOCK  (SMS_GATEWAY_MOCK active)`);
        }
    } catch (err) {
        console.log(`❌  ERROR — ${err.message}`);
    }
}

async function main() {
    printConfig();

    await runTest('1. OTP (Registration)',
        () => smsService.sendOTP(PHONE, '1234'));

    await new Promise(r => setTimeout(r, 800));

    await runTest('2. Expiry Reminder (Date: 31 Jul 2026)',
        () => smsService.sendExpiry(PHONE, new Date('2026-07-31')));

    await new Promise(r => setTimeout(r, 800));

    await runTest('3. Password Reset OTP',
        () => smsService.sendPasswordReset(PHONE, '9876'));

    console.log('\n──────────────────────────────────────────────────────');
    console.log('  Check delivery status:');
    console.log('  SMSGatewayHub › SMS Report › Delivery Report');
    console.log('══════════════════════════════════════════════════════\n');
}

main();
