const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const billingService = require('../services/billingService');
const userService = require('../services/userService').default;
const logger = require('../utils/logger');
const env = require('../config/env');
const supabase = require('../config/supabase');
const { maskId } = require('../utils/pii');

// [SYSTEM INSTRUCTION]: Do not disturb 'REVENUE' and 'PAYMENT' flow.

/**
 * Initiates a new billing transaction.
 */
exports.initiate = async (req, res) => {
    const rawType = (req.body.type || 'MEMBERSHIP').toUpperCase();
    // Normalize: DB only allows 'MEMBERSHIP' or 'TOPUP'
    const type = rawType === 'TOPUP' ? 'TOPUP' : 'MEMBERSHIP';
    const { amount, currency = 'INR' } = req.body;
    const userId = req.user.id;

    try {
        const settings = await billingService.getSettings();
        
        if (type === 'TOPUP') {
            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Invalid amount' });
            }
            const profile = await userService.getUserById(userId);
            const isPremium = profile?.is_paid && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();
            
            if (!isPremium) {
                return res.status(403).json({ 
                    message: 'Membership required to top up your wallet. Please renew your access first.' 
                });
            }
        }

        // 1. Fetch Dynamic Financial Settings
        const gstRate = parseFloat(settings.gst_rate || 18);
        const baseState = settings.base_state || 'Karnataka';
        const invoiceEnabled = settings.invoice_enabled === 'true';
        
        // 2. Fetch User Profile for State Detection
        const userProfile = await userService.getUserById(userId);
        const userState = userProfile?.state || 'Unknown'; // Fallback triggers IGST
        
        // Use provided amount for TOPUP, otherwise default to subscription_price from settings
        let priceRupees = (type === 'TOPUP') ? Number(amount) : Number(amount || settings.subscription_price || 99);
        if (isNaN(priceRupees) || priceRupees <= 0) priceRupees = 99;
        
        // 3. SECURE INTEGER MATH: Convert to Paise immediately
        const totalAmountPaise = Math.round(priceRupees * 100);
        
        // 4. TAX CALCULATION (Paise-based Integer Math)
        // Taxable = (Total * 100) / (100 + GST_Rate) -> rounded to nearest Paise
        const taxableAmountPaise = Math.round((totalAmountPaise * 100) / (100 + gstRate));
        const totalGstPaise = totalAmountPaise - taxableAmountPaise;

        let cgstPaise = 0, sgstPaise = 0, igstPaise = 0;
        
        if (userState === baseState) {
            // Intra-state: CGST + SGST (50/50 split of total GST)
            cgstPaise = Math.round(totalGstPaise / 2);
            sgstPaise = totalGstPaise - cgstPaise; // Handle odd Paise
        } else {
            // Inter-state or Unknown: IGST
            igstPaise = totalGstPaise;
        }

        // --- MOCK MODE CHECK ---
        const isMockMode = env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id' || !env.RAZORPAY_KEY_ID;
        
        if (isMockMode) {
            logger.info({ userId }, '[Billing] Mock Mode: Performing robust consistency checks');
            
            // 1. Ensure user exists via Service Layer
            const userProfile = await userService.getUserById(userId);

            if (!userProfile) {
                logger.info({ userId }, '[Billing] User not found, performing emergency sync');
                const fullName = req.user.full_name || req.user.fullName || 'Sync User';
                const phone = req.user.phone || '0000000000';
                
                await userService.upsertUser({
                    id: userId,
                    phone: phone,
                    full_name: fullName,
                    status: 'active',
                    role: 'student'
                });
            }

            const mockToken = `token_sync_${Math.random().toString(36).substring(7)}`;

            // 2. Store mock record via Service Layer
            await billingService.createPayment({
                user_id: userId,
                amount_paise: totalAmountPaise,
                currency: 'INR',
                status: 'pending',
                transaction_id: mockToken,
                provider: 'mock',
                payment_type: type,
                credits_awarded: 0
            });

            return res.status(201).json({
                message: "Sync initiated successfully",
                token: "mock_key",
                entry: { id: mockToken, amount: totalAmountPaise, currency: 'INR' },
                mock: true
            });
        }

        const options = {
            amount: totalAmountPaise,
            currency,
            receipt: `rcpt_sync_${Date.now()}`,
            notes: {
                userId: userId,
                syncType: type,
                env: env.NODE_ENV || 'development'
            }
        };

        const transactionRecord = await razorpay.orders.create(options);

        // Store the record with full tax breakdown in Paise
        await billingService.createPayment({
            user_id: userId,
            amount_paise: totalAmountPaise,
            taxable_amount_paise: taxableAmountPaise,
            cgst_paise: cgstPaise,
            sgst_paise: sgstPaise,
            igst_paise: igstPaise,
            gst_rate: gstRate,
            state: userState,
            currency,
            status: 'pending',
            transaction_id: transactionRecord.id,
            provider: 'secure_provider',
            payment_type: type
        });

        res.status(201).json({
            message: `${type} sync created successfully`,
            token: env.RAZORPAY_KEY_ID,
            entry: {
                id: transactionRecord.id,
                amount: transactionRecord.amount,
                currency: transactionRecord.currency,
                receipt: transactionRecord.receipt
            }
        });
    } catch (error) {
        logger.error({ error }, 'Initiate Error');
        res.status(500).json({ message: 'Error initiating sync', error: error.message });
    }
};

/**
 * Confirms the transaction signature.
 */
exports.confirm = async (req, res) => {
    const { sync_id: razorpay_order_id, entry_id: razorpay_payment_id, signature: razorpay_signature } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing sync data' });
    }
    try {
        // --- MOCK VERIFICATION ---
        const isMockMode = env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id' || !env.RAZORPAY_KEY_ID;
        const isMockTxn = razorpay_order_id.startsWith('token_sync_');

        if (!isMockTxn || !isMockMode) {
            // 1. Verify Signature
            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSign = crypto
                .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
                .update(sign.toString())
                .digest("hex");

            if (razorpay_signature !== expectedSign) {
                await billingService.failPayment(razorpay_order_id);
                return res.status(400).json({ message: 'Invalid sync signature' });
            }
        }

        // 2. Identify Record via Service Layer
        const record = await billingService.getPaymentByTransactionId(razorpay_order_id);
        if (!record) throw new Error('Record not found');

        if (record.status === 'pending') {
            const settings = await billingService.getSettings();
            
            // Generate Invoice Number if enabled
            let invoiceNo = null;
            if (settings.invoice_enabled === 'true') {
                const prefix = settings.invoice_prefix || 'Lab-SL/26-27/';
                const nextNum = parseInt(settings.next_invoice_number || 1);
                invoiceNo = `${prefix}${nextNum.toString().padStart(4, '0')}`;
                
                // Increment for next time (Atomic update in DB is better, but this works for now)
                await billingService.updateSettings({ key: 'next_invoice_number', value: (nextNum + 1).toString() });
            }

            // Update Payment Status & Tax Record
            await billingService.updatePayment(razorpay_order_id, { 
                status: 'completed', 
                transaction_id: razorpay_payment_id,
                invoice_no: invoiceNo,
                updated_at: new Date().toISOString() 
            });

            // Handle Credits/Wallet (Paise increments)
            if (record.payment_type === 'TOPUP') {
                await userService.incrementWallet(userId, BigInt(record.amount_paise));
            }
            
            const updates = {};
            const durationDays = parseInt(record.payment_type === 'TOPUP' ? (settings.topup_duration_days || 0) : (settings.subscription_duration_days || 30));
            
            if (durationDays > 0) {
                const userProfile = await userService.getUserById(userId);
                const currentExpiry = userProfile?.subscription_expires_at ? new Date(userProfile.subscription_expires_at) : new Date();
                const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                const newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
                updates.subscription_expires_at = newExpiry.toISOString();
                updates.is_paid = true;
            }

            // Commit all profile updates
            if (Object.keys(updates).length > 0) {
                await userService.updateUser(userId, updates);
            }
        }

        res.json({ message: 'Sync confirmed and service extended.' });
    } catch (error) {
        logger.error({ error }, 'Confirm Error');
        res.status(500).json({ message: 'Internal error during confirmation' });
    }
};

/**
 * Enhanced Webhook Handler (Internal).
 */
exports.processInternal = async (req, res) => {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    try {
        const expectedSignature = crypto.createHmac('sha256', secret).update(req.body).digest('hex');

        if (signature !== expectedSignature) {
            logger.error('[Webhooks] Critical Signature Mismatch (Potential Attack)');
            return res.status(400).send('Invalid sync signature');
        }

        const eventData = JSON.parse(req.body.toString());
        const event = eventData.event;
        const payload = eventData.payload.payment.entity;

        if (event === 'payment.captured' || event === 'order.paid') {
            const entryId = payload.order_id;
            const syncId = payload.id;
            const userId = payload.notes.userId;

            const record = await billingService.getPaymentByTransactionId(entryId);

            if (record && record.status === 'pending') {
                const settings = await billingService.getSettings();
                await billingService.updatePayment(entryId, { status: 'completed', transaction_id: syncId });

                if (record.payment_type === 'TOPUP') {
                    await userService.incrementWallet(userId, BigInt(record.amount_paise));
                }
                
                const durationDays = parseInt(record.payment_type === 'TOPUP' ? (settings.topup_duration_days || 0) : (settings.subscription_duration_days || 30));
                
                if (durationDays > 0) {
                    const userProfile = await userService.getUserById(userId);
                    const currentExpiry = userProfile?.subscription_expires_at ? new Date(userProfile.subscription_expires_at) : new Date();
                    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                    const newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

                    await userService.updateUser(userId, { 
                        is_paid: true, 
                        subscription_expires_at: newExpiry.toISOString() 
                    });
                }
            }
        }

        res.status(200).send('OK');
    } catch (err) {
        logger.error({ err: err.message }, 'Process Internal Error');
        res.status(500).send('Internal Error');
    }
};

/**
 * Fetches user history with refund status.
 */
exports.getHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const history = await billingService.getUserPayments(userId);
        
        // Fetch all non-failed refunds for the user to attach to payments
        const { data: refunds, error: refundError } = await supabase
            .from('refunds')
            .select('*')
            .eq('user_id', userId)
            .neq('status', 'failed');

        if (refundError) {
            logger.error({ refundError }, 'Error fetching refunds for history');
        }

        const historyWithRefunds = history.map(payment => {
            const paymentRefunds = (refunds || []).filter(r => r.payment_id === payment.transaction_id);
            const totalRefundedPaise = paymentRefunds.reduce((sum, r) => sum + Number(r.refund_amount_paise), 0);
            return {
                ...payment,
                refunded_amount_paise: totalRefundedPaise,
                refunds: paymentRefunds
            };
        });

        res.json({ history: historyWithRefunds });
    } catch (error) {
        logger.error({ error }, 'Get History Error');
        res.status(500).json({ message: 'Error fetching history' });
    }
};

/**
 * Processes a payment refund request.
 */
exports.processRefund = async (req, res) => {
    const { payment_id, refund_type, amount, reason_category, reason_notes } = req.body;
    const actorId = req.user.id;

    // 1. Parameter Validations
    if (!payment_id || typeof payment_id !== 'string') {
        return res.status(400).json({ message: 'payment_id is required and must be a string.' });
    }

    const isRazorpayId = payment_id.startsWith('pay_');
    const isMockId = payment_id.startsWith('token_sync_') || payment_id.startsWith('mock_');
    if (!isRazorpayId && !isMockId) {
        return res.status(400).json({ message: 'Invalid payment ID format.' });
    }

    if (isRazorpayId && payment_id.length !== 18) {
        return res.status(400).json({ message: 'Invalid Razorpay Payment ID length. Must be exactly 18 characters.' });
    }

    if (!refund_type || !['full', 'partial'].includes(refund_type)) {
        return res.status(400).json({ message: 'Invalid refund type. Must be "full" or "partial".' });
    }

    const validReasons = [
        'Duplicate payment / Charged twice',
        'Order cancelled by customer',
        'Other'
    ];
    if (!reason_category || !validReasons.includes(reason_category)) {
        return res.status(400).json({ message: 'Invalid or missing reason category.' });
    }

    if (reason_category === 'Other') {
        if (!reason_notes || typeof reason_notes !== 'string' || reason_notes.trim().length < 10) {
            return res.status(400).json({ message: 'Detailed explanation is required for category "Other" (minimum 10 characters).' });
        }
    }

    try {
        // 2. Original Payment Lookup
        const payment = await billingService.getPaymentByTransactionId(payment_id);
        if (!payment) {
            return res.status(404).json({ message: 'Payment record not found.' });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({ message: 'Only completed payments can be refunded.' });
        }

        if (payment.payment_type !== 'TOPUP') {
            return res.status(400).json({ message: 'Refunds are only available for wallet top-up transactions.' });
        }

        // 30-Day refund eligibility window check
        const ageMs = Date.now() - new Date(payment.created_at).getTime();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (ageMs > thirtyDaysMs) {
            return res.status(400).json({ message: 'Refunds are only eligible within 30 days of the transaction date.' });
        }

        // 3. Ownership / Authorization Check
        const isAdmin = req.user && ['admin', 'super_admin', 'moderator'].includes(req.user.role);
        if (!isAdmin && payment.user_id !== actorId) {
            return res.status(403).json({ message: 'You are not authorized to refund this payment.' });
        }

        // 4. Double Refund and Amount Range Verification
        let alreadyRefundedPaise = 0;
        try {
            const existingRefunds = await billingService.getRefundsByPaymentId(payment_id);
            alreadyRefundedPaise = existingRefunds.reduce((sum, r) => sum + Number(r.refund_amount_paise), 0);
        } catch (dbErr) {
            if (dbErr.message.includes('Could not find the table') || dbErr.code === '42P01') {
                logger.error({ dbErr }, 'Refunds table is missing. Please run database/migration_v12_refunds.sql in Supabase SQL Editor.');
                return res.status(500).json({ 
                    message: 'Database setup incomplete. Please contact administrator to run refunds migration script.' 
                });
            }
            throw dbErr;
        }

        const remainingPaise = Number(payment.amount_paise) - alreadyRefundedPaise;
        if (remainingPaise <= 0) {
            return res.status(400).json({ message: 'This transaction has already been fully refunded.' });
        }

        let refundAmountPaise = 0;
        if (refund_type === 'full') {
            refundAmountPaise = Number(payment.amount_paise);
        } else {
            // Partial
            if (amount === undefined || isNaN(amount) || amount <= 0) {
                return res.status(400).json({ message: 'Amount is required and must be a positive number for partial refunds.' });
            }
            refundAmountPaise = Math.round(amount * 100);
            if (refundAmountPaise >= Number(payment.amount_paise)) {
                return res.status(400).json({ message: 'Partial refund amount must be less than the total payment amount.' });
            }
        }

        if (refundAmountPaise > remainingPaise) {
            return res.status(400).json({ 
                message: `Requested refund amount of ₹${(refundAmountPaise / 100).toFixed(2)} exceeds the remaining refundable balance of ₹${(remainingPaise / 100).toFixed(2)}.` 
            });
        }

        // 5. Razorpay Integration
        const isMockMode = env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id' || !env.RAZORPAY_KEY_ID || payment_id.startsWith('token_sync_') || payment_id.startsWith('mock_');
        
        let refundId;
        let status = 'completed';

        if (isMockMode) {
            refundId = `rfnd_mock_${crypto.randomBytes(8).toString('hex')}`;
            logger.info({ paymentId: payment_id, refundAmountPaise }, 'Mock Refund processed successfully');
        } else {
            try {
                const razorpayRefund = await razorpay.payments.refund(payment_id, {
                    amount: refundAmountPaise,
                    notes: {
                        reason_category,
                        reason_notes: reason_notes || ''
                    }
                });
                refundId = razorpayRefund.id;
                status = razorpayRefund.status === 'processed' ? 'completed' : 'pending';
            } catch (rzpErr) {
                logger.error({ rzpErr, payment_id }, 'Razorpay Refund API Call Failed');
                return res.status(500).json({ message: 'Razorpay refund processing failed', error: rzpErr.message });
            }
        }

        // 6. DB Records: Create Refund record
        const refundRecord = {
            user_id: payment.user_id,
            payment_id: payment_id,
            razorpay_refund_id: refundId,
            refund_amount_paise: refundAmountPaise,
            refund_type: refund_type,
            reason_category: reason_category,
            reason_notes: reason_notes || null,
            status: status
        };

        const savedRefund = await billingService.createRefund(refundRecord);

        // 7. Wallet / Balance Adjustment
        if (payment.payment_type === 'TOPUP') {
            await userService.incrementWallet(payment.user_id, -refundAmountPaise);
            logger.info({ userId: maskId(payment.user_id), amount: -refundAmountPaise }, 'Deducted refunded amount from user wallet balance');
        }

        // 8. Log event to public.audit_trail
        try {
            await supabase
                .from('audit_trail')
                .insert({
                    event_type: 'PAYMENT_REFUND',
                    severity: 'INFO',
                    actor_id: actorId,
                    target_id: payment.user_id,
                    message: `Processed ${refund_type} refund of ₹${(refundAmountPaise / 100).toFixed(2)} for payment ${payment_id}. Reason: ${reason_category}.`,
                    metadata: {
                        payment_id,
                        refund_id: refundId,
                        refund_amount_paise: refundAmountPaise,
                        reason_category,
                        reason_notes
                    },
                    ip_address: req.ip || req.headers['x-forwarded-for'] || null,
                    user_agent: req.headers['user-agent'] || null
                });
        } catch (auditErr) {
            logger.warn({ auditErr }, 'Failed to insert to audit_trail');
        }

        // 9. Structured JSON output
        return res.status(200).json({
            success: true,
            message: 'Refund processed successfully.',
            refund: {
                id: savedRefund.id,
                razorpay_refund_id: refundId,
                refund_amount_paise: refundAmountPaise,
                refund_amount_rupees: refundAmountPaise / 100,
                refund_type: refund_type,
                reason_category: reason_category,
                status: status,
                created_at: savedRefund.created_at
            }
        });

    } catch (error) {
        logger.error({ error, payment_id }, 'Process Refund Error');
        return res.status(500).json({ message: 'Internal error processing refund', error: error.message });
    }
};
