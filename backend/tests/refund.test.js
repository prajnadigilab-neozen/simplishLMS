const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const API_URL = 'http://localhost:5000/api/v1';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('==================================================');
    console.log(' SIMPLISH — Razorpay Refund Endpoint Integration Tests');
    console.log('==================================================\n');

    // 1. Authenticate user
    console.log('--- Step 1: Logging in test user ---');
    let token;
    try {
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '9112233445', password: 'password123' })
        });
        const loginData = await loginRes.json();
        token = loginData.token;
        if (!token) {
            console.error('Failed to log in. Res:', loginData);
            process.exit(1);
        }
        console.log('✓ Login successful!\n');
    } catch (err) {
        console.error('Connection to server failed. Is backend server running on port 5000?', err);
        process.exit(1);
    }

    // Check profile for initial wallet balance
    const initialProfileRes = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const initialProfile = await initialProfileRes.json();
    const initialWalletBalance = Number(initialProfile.user?.wallet_balance || 0);
    console.log(`Initial User Wallet Balance: ₹${(initialWalletBalance / 100).toFixed(2)}\n`);

    // 2. Test Scenario 1: Block Membership Refund & Verify Full Refund on TOPUP
    console.log('--- Scenario 1: Block Membership Refund & Verify Full Refund on TOPUP ---');
    
    // A. Create a MEMBERSHIP payment and verify it cannot be refunded
    console.log('A. Initiating and confirming a MEMBERSHIP payment...');
    const initMemRes = await fetch(`${API_URL}/billing/initiate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'MEMBERSHIP', amount: 99 })
    });
    const memData = await initMemRes.json();
    const memOrderId = memData.entry.id;
    
    const confirmMemRes = await fetch(`${API_URL}/billing/confirm`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            sync_id: memOrderId, 
            entry_id: `pay_mem_${Math.random().toString(36).substring(2, 12)}`,
            signature: 'mock_sig' 
        })
    });
    await confirmMemRes.json();

    // Fetch history to get the membership payment transaction ID
    const historyRes = await fetch(`${API_URL}/billing/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData = await historyRes.json();
    const memPayment = (historyData.history || []).find(p => p.status === 'completed' && p.payment_type === 'MEMBERSHIP');
    
    console.log(`   Attempting to refund membership payment: ${memPayment.transaction_id}...`);
    const memRefundRes = await fetch(`${API_URL}/billing/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            payment_id: memPayment.transaction_id,
            refund_type: 'full',
            reason_category: 'Order cancelled by customer'
        })
    });
    const memRefundData = await memRefundRes.json();
    console.log('   API Status:', memRefundRes.status);
    console.log('   API Message:', memRefundData.message);
    if (memRefundRes.status !== 400) {
        console.error('❌ MEMBERSHIP refund was not blocked!');
        process.exit(1);
    }
    console.log('✓ MEMBERSHIP refund successfully blocked!\n');

    // B. Initiate TOPUP payment for refund testing
    console.log('B. Initiating TOPUP payment...');
    const initTopup1Res = await fetch(`${API_URL}/billing/initiate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'TOPUP', amount: 100 })
    });
    const topup1Data = await initTopup1Res.json();
    const topup1OrderId = topup1Data.entry.id;
    console.log(`   ✓ TOPUP payment initiated. Order ID: ${topup1OrderId}`);

    // Confirm TOPUP payment
    console.log('Confirming TOPUP payment...');
    const confirmTopup1Res = await fetch(`${API_URL}/billing/confirm`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            sync_id: topup1OrderId, 
            entry_id: `pay_top_${Math.random().toString(36).substring(2, 12)}`,
            signature: 'mock_sig' 
        })
    });
    await confirmTopup1Res.json();

    // Fetch history to get the topup's transaction_id
    const historyRes1_topup = await fetch(`${API_URL}/billing/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData1_topup = await historyRes1_topup.json();
    const confirmedPayment = (historyData1_topup.history || []).find(p => p.status === 'completed' && p.payment_type === 'TOPUP' && (p.refunded_amount_paise || 0) === 0);
    if (!confirmedPayment) {
        console.error('Failed to locate confirmed topup payment in history.');
        process.exit(1);
    }
    const payment1Id = confirmedPayment.transaction_id;
    console.log(`   TOPUP Payment ID in DB: ${payment1Id}`);

    // C. Request Full Refund
    console.log('C. Requesting Full Refund...');
    const refund1Res = await fetch(`${API_URL}/billing/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            payment_id: payment1Id,
            refund_type: 'full',
            reason_category: 'Order cancelled by customer'
        })
    });
    const refund1Data = await refund1Res.json();
    
    if (refund1Res.status === 500 && refund1Data.message?.includes('Database setup incomplete')) {
        console.error('\n❌ TEST BLOCKED: The refunds table does not exist in Supabase.');
        console.error('👉 Please execute backend/database/migration_v12_refunds.sql in the Supabase SQL Editor first, then rerun this test.\n');
        process.exit(1);
    }

    console.log('   Refund API Status:', refund1Res.status);
    console.log('   Refund API Output:', JSON.stringify(refund1Data, null, 2));
    if (refund1Res.status !== 200 || !refund1Data.success) {
        console.error('❌ Full refund scenario failed!');
        process.exit(1);
    }
    console.log('✓ Full Refund successful!\n');

    // D. Attempt Double Refund
    console.log('D. Attempting to refund the same payment again (Double Refund Block)...');
    const doubleRefund1Res = await fetch(`${API_URL}/billing/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            payment_id: payment1Id,
            refund_type: 'full',
            reason_category: 'Duplicate payment / Charged twice'
        })
    });
    const doubleRefund1Data = await doubleRefund1Res.json();
    console.log('   API Status:', doubleRefund1Res.status);
    console.log('   API Message:', doubleRefund1Data.message);
    if (doubleRefund1Res.status !== 400) {
        console.error('❌ Double refund was not blocked!');
        process.exit(1);
    }
    console.log('✓ Double Refund successfully blocked!\n');


    // 3. Test Scenario 2: Partial Refunds
    console.log('--- Scenario 2: Partial Refunds ---');

    // A. Initiate and Confirm a new payment (₹99 TOPUP price)
    console.log('A. Creating a new payment for partial refund testing...');
    const initTopup2Res = await fetch(`${API_URL}/billing/initiate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'TOPUP', amount: 99 })
    });
    const topup2Data = await initTopup2Res.json();
    const topup2OrderId = topup2Data.entry.id;

    const confirmTopup2Res = await fetch(`${API_URL}/billing/confirm`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            sync_id: topup2OrderId, 
            entry_id: `pay_prt_${Math.random().toString(36).substring(2, 12)}`, // Exactly 18 characters total
            signature: 'mock_sig' 
        })
    });
    await confirmTopup2Res.json();

    const historyRes2 = await fetch(`${API_URL}/billing/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData2 = await historyRes2.json();
    // find the latest payment
    const paymentId2 = historyData2.history[0].transaction_id;
    const totalAmountPaise = Number(historyData2.history[0].amount_paise);
    console.log(`   New Payment ID: ${paymentId2} (Amount: ₹${(totalAmountPaise / 100).toFixed(2)})`);

    // B. Partial Refund 1: ₹30
    console.log('B. Refunding ₹30 (Partial)...');
    const part1Res = await fetch(`${API_URL}/billing/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            payment_id: paymentId2,
            refund_type: 'partial',
            amount: 30,
            reason_category: 'Duplicate payment / Charged twice'
        })
    });
    const part1Data = await part1Res.json();
    console.log('   API Status:', part1Res.status);
    console.log('   API Message:', part1Data.message);
    console.log('   Refunded Amount:', part1Data.refund?.refund_amount_rupees);
    if (part1Res.status !== 200 || part1Data.refund?.refund_amount_paise !== 3000) {
        console.error('❌ First partial refund failed!');
        process.exit(1);
    }

    // C. Partial Refund 2: ₹40 (Cumulative is ₹70, remaining is ₹29)
    console.log('C. Refunding ₹40 (Partial)...');
    const part2Res = await fetch(`${API_URL}/billing/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            payment_id: paymentId2,
            refund_type: 'partial',
            amount: 40,
            reason_category: 'Order cancelled by customer'
        })
    });
    const part2Data = await part2Res.json();
    console.log('   API Status:', part2Res.status);
    console.log('   Refunded Amount:', part2Data.refund?.refund_amount_rupees);
    if (part2Res.status !== 200 || part2Data.refund?.refund_amount_paise !== 4000) {
        console.error('❌ Second partial refund failed!');
        process.exit(1);
    }

    // D. Over-Refund attempt: ₹35 (remaining is ₹29, so ₹35 should fail)
    console.log('D. Attempting to refund ₹35 (exceeds remaining balance)...');
    const part3Res = await fetch(`${API_URL}/billing/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            payment_id: paymentId2,
            refund_type: 'partial',
            amount: 35,
            reason_category: 'Other',
            reason_notes: 'Details notes that are long enough'
        })
    });
    const part3Data = await part3Res.json();
    console.log('   API Status:', part3Res.status);
    console.log('   API Message:', part3Data.message);
    if (part3Res.status !== 400) {
        console.error('❌ Over-refund was not blocked!');
        process.exit(1);
    }
    console.log('✓ Partial Refund limits and validations verified successfully!\n');


    // 4. Test Scenario 3: Wallet Deductions for TOPUP Payments
    console.log('--- Scenario 3: Wallet Deduction on TOPUP Refund ---');

    // Fetch profile to get baseline wallet balance before Scenario 3 starts
    const baseProfileRes = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const baseProfile = await baseProfileRes.json();
    const baseWalletBalance = Number(baseProfile.user?.wallet_balance || 0);

    // A. Initiate and Confirm a TOPUP payment of ₹100
    console.log('A. Initiating TOPUP of ₹100...');
    const initTopupRes = await fetch(`${API_URL}/billing/initiate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'TOPUP', amount: 100 })
    });
    const topupData = await initTopupRes.json();
    const topupOrderId = topupData.entry.id;

    console.log('B. Confirming TOPUP payment...');
    const confirmTopupRes = await fetch(`${API_URL}/billing/confirm`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            sync_id: topupOrderId, 
            entry_id: `pay_top_${Math.random().toString(36).substring(2, 12)}`, // Exactly 18 characters total
            signature: 'mock_sig' 
        })
    });
    await confirmTopupRes.json();

    // Check profile to verify wallet balance increased by ₹100 (10000 Paise)
    const midProfileRes = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const midProfile = await midProfileRes.json();
    const midWalletBalance = Number(midProfile.user?.wallet_balance || 0);
    console.log(`   User Wallet Balance after Topup: ₹${(midWalletBalance / 100).toFixed(2)}`);
    if (midWalletBalance !== baseWalletBalance + 10000) {
        console.error('❌ Wallet balance did not increase correctly by ₹100.');
        process.exit(1);
    }

    // Let's retrieve the TOPUP payment ID
    const historyRes3 = await fetch(`${API_URL}/billing/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const historyData3 = await historyRes3.json();
    const topupPaymentId = historyData3.history[0].transaction_id;
    console.log(`   TOPUP Payment ID: ${topupPaymentId}`);

    // C. Refund ₹50 (partial) of the TOPUP payment
    console.log('C. Refunding ₹50 (Partial) of TOPUP payment...');
    const topupRefundRes = await fetch(`${API_URL}/billing/refund`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            payment_id: topupPaymentId,
            refund_type: 'partial',
            amount: 50,
            reason_category: 'Order cancelled by customer'
        })
    });
    const topupRefundData = await topupRefundRes.json();
    console.log('   API Status:', topupRefundRes.status);
    console.log('   API Message:', topupRefundData.message);

    // Check profile to verify wallet balance decreased by ₹50 (5000 Paise)
    const finalProfileRes = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalProfile = await finalProfileRes.json();
    const finalWalletBalance = Number(finalProfile.user?.wallet_balance || 0);
    console.log(`   User Wallet Balance after Refund: ₹${(finalWalletBalance / 100).toFixed(2)}`);
    
    if (finalWalletBalance !== midWalletBalance - 5000) {
        console.error('❌ Wallet balance did not decrease correctly by ₹50.');
        process.exit(1);
    }
    console.log('✓ Wallet balance correctly decremented!\n');

    console.log('==================================================');
    console.log(' 🎉 ALL INTEGRATION TEST SCENARIOS PASSED!');
    console.log('==================================================');
}

runTests().catch(err => {
    console.error('Unhandled test script failure:', err);
    process.exit(1);
});
