const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const billingService = require('../services/billingService');
const userService = require('../services/userService').default;
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Initiates a new billing transaction.
 */
exports.initiate = async (req, res) => {
    const rawType = (req.body.type || 'MEMBERSHIP').toUpperCase();
    // Normalize: DB only allows 'MEMBERSHIP' or 'TOPUP'
    const type = rawType === 'TOPUP' ? 'TOPUP' : 'MEMBERSHIP';
    const { amount, currency = 'INR' } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }
    
    try {
        const config = await billingService.getSettings();
        
        if (type === 'TOPUP') {
            const profile = await userService.getUserById(userId);
            const isPremium = profile?.is_paid && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();
            
            if (!isPremium) {
                return res.status(403).json({ 
                    message: 'Membership required to top up your wallet. Please renew your access first.' 
                });
            }
        }

        // Use provided amount for TOPUP, otherwise default to subscription_price from settings
        let price = (type === 'TOPUP') ? Number(amount) : Number(config.subscription_price || 99);
        if (isNaN(price) || price <= 0) price = 99; // Final fallback to prevent NaN crashes
        
        const amountInPaisa = Math.round(price * 100);

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
                amount: price,
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
                entry: { id: mockToken, amount: amountInPaisa, currency: 'INR' },
                mock: true
            });
        }

        const options = {
            amount: amountInPaisa,
            currency,
            receipt: `rcpt_sync_${Date.now()}`,
            notes: {
                userId: userId,
                syncType: type,
                env: env.NODE_ENV || 'development'
            }
        };

        const transactionRecord = await razorpay.orders.create(options);

        // Store the record in our database
        await billingService.createPayment({
            user_id: userId,
            amount: price,
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
        if (!razorpay_order_id.startsWith('token_sync_') || env.NODE_ENV === 'production') {
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
            const config = await billingService.getSettings();

            // Update Payment Status via Service Layer
            await billingService.updatePayment(razorpay_order_id, { 
                status: 'completed', 
                transaction_id: razorpay_payment_id,
                updated_at: new Date().toISOString() 
            });

            // Fetch User profile via Service Layer
            const userProfile = await userService.getUserById(userId);
            const updates = {};

            if (record.payment_type === 'TOPUP') {
                // Handle Wallet Topup ATOMICALLY
                await userService.incrementWallet(userId, Number(record.amount));

                // Hybrid Logic: Also award membership days if configured
                const topupDays = parseInt(config.topup_duration_days || 0);
                if (topupDays > 0) {
                    const currentExpiry = userProfile?.subscription_expires_at ? new Date(userProfile.subscription_expires_at) : new Date();
                    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                    const newExpiry = new Date(baseDate.getTime() + topupDays * 24 * 60 * 60 * 1000);
                    updates.subscription_expires_at = newExpiry.toISOString();
                    updates.is_paid = true;
                }
            } else {
                // Handle Lifecycle extension (MEMBERSHIP)
                const durationDays = parseInt(config.subscription_duration_days || 30);
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
                await billingService.updatePayment(entryId, { status: 'completed', transaction_id: syncId });

                if (record.payment_type === 'TOPUP') {
                    await userService.incrementWallet(userId, Number(record.amount));
                } else {
                    const config = await billingService.getSettings();
                    const durationDays = parseInt(config.subscription_duration_days || 30);
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
 * Fetches user history.
 */
exports.getHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const history = await billingService.getUserPayments(userId);
        res.json({ history });
    } catch (error) {
        logger.error({ error }, 'Get History Error');
        res.status(500).json({ message: 'Error fetching history' });
    }
};
