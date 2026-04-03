const supabase = require('../config/supabase');
const crypto = require('crypto');
const razorpay = require('../config/razorpay');

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
        // Fetch values from metadata for dynamic pricing
        const { data: storeMetadata } = await supabase.from('settings').select('*');
        const config = (storeMetadata || []).reduce((acc, curr) => { 
            if (curr.key && curr.value) acc[curr.key] = curr.value; 
            return acc; 
        }, {});
        
        // Use provided amount for TOPUP, otherwise default to subscription_price from settings
        let price = (type === 'TOPUP') ? Number(amount) : Number(config.subscription_price || 99);
        if (isNaN(price) || price <= 0) price = 99; // Final fallback to prevent NaN crashes
        
        const amountInPaisa = Math.round(price * 100);

        // --- MOCK MODE CHECK ---
        const isMockMode = process.env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id' || !process.env.RAZORPAY_KEY_ID;
        
        if (isMockMode) {
            console.log('MOCK MODE: Simulating transaction record creation');
            const mockToken = `token_sync_${Math.random().toString(36).substring(7)}`;
            
            // Store mock record in DB
            const { error: mockInsertError } = await supabase.from('payments').insert([{
                user_id: userId,
                amount: price,
                currency: 'INR',
                status: 'pending',
                transaction_id: mockToken,
                provider: 'mock',
                payment_type: type 
            }]);

            if (mockInsertError) {
                console.error('MOCK INSERT ERROR:', mockInsertError);
                return res.status(500).json({ message: 'Metadata sync error', error: mockInsertError.message });
            }

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
                env: process.env.NODE_ENV || 'development'
            }
        };

        const transactionRecord = await razorpay.orders.create(options);

        // Store the record in our database
        const { data, error } = await supabase
            .from('payments')
            .insert([{
                user_id: userId,
                amount: price,
                currency,
                status: 'pending',
                transaction_id: transactionRecord.id,
                provider: 'secure_provider',
                payment_type: type
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: `${type} sync created successfully`,
            token: process.env.RAZORPAY_KEY_ID,
            entry: {
                id: transactionRecord.id,
                amount: transactionRecord.amount,
                currency: transactionRecord.currency,
                receipt: transactionRecord.receipt
            }
        });
    } catch (error) {
        console.error('Initiate Error:', error);
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
        if (razorpay_order_id.startsWith('token_sync_')) {
            console.log('MOCK MODE: Confirming mock sync');
        } else {
            // 1. Verify Signature
            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSign = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(sign.toString())
                .digest("hex");

            if (razorpay_signature !== expectedSign) {
                await supabase.from('payments').update({ status: 'failed' }).eq('transaction_id', razorpay_order_id);
                return res.status(400).json({ message: 'Invalid sync signature' });
            }
        }

        // 2. Identify Record
        const { data: record, error: fetchError } = await supabase
            .from('payments')
            .select('amount, payment_type, status')
            .eq('transaction_id', razorpay_order_id)
            .single();

        if (fetchError || !record) throw new Error('Record not found');

        if (record.status === 'pending') {
            // 3. Fetch Settings for potential hybrid logic
            const { data: metadata } = await supabase.from('settings').select('*');
            const config = (metadata || []).reduce((acc, curr) => { acc[curr.key] = curr.value; return acc; }, {});

            // Update Sync Status
            await supabase
                .from('payments')
                .update({ 
                    status: 'completed', 
                    transaction_id: razorpay_payment_id,
                    updated_at: new Date().toISOString() 
                })
                .eq('transaction_id', razorpay_order_id);

            // Fetch User for update
            const { data: userProfile } = await supabase
                .from('users')
                .select('wallet_balance, subscription_expires_at')
                .eq('id', userId)
                .single();

            const updates = {};

            if (record.payment_type === 'TOPUP') {
                // 4a. Handle Wallet Topup
                const currentBalance = Number(userProfile?.wallet_balance || 0);
                updates.wallet_balance = currentBalance + Number(record.amount);

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
                // 4b. Handle Lifecycle extension (MEMBERSHIP)
                const durationDays = parseInt(config.subscription_duration_days || 30);
                const currentExpiry = userProfile?.subscription_expires_at ? new Date(userProfile.subscription_expires_at) : new Date();
                const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                const newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
                
                updates.subscription_expires_at = newExpiry.toISOString();
                updates.is_paid = true;
            }

            // Commit all profile updates in one call
            if (Object.keys(updates).length > 0) {
                await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', userId);
            }
        }

        res.json({ message: 'Sync confirmed and service extended.' });
    } catch (error) {
        console.error('Confirm Error:', error);
        res.status(500).json({ message: 'Internal error during confirmation' });
    }
};

/**
 * Enhanced Webhook Handler (Internal).
 */
exports.processInternal = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    try {
        // 🛡️ Security Hardening: Raw Body Signature Verification (PCI DSS 4.0)
        // Since server.js uses express.raw() for this endpoint, req.body is a Buffer.
        const expectedSignature = crypto.createHmac('sha256', secret).update(req.body).digest('hex');

        if (signature !== expectedSignature) {
            console.error('[Webhooks] Critical Signature Mismatch (Potential Attack)');
            return res.status(400).send('Invalid sync signature');
        }

        // Parse buffer back to object for logic processing
        const eventData = JSON.parse(req.body.toString());
        const event = eventData.event;
        const payload = eventData.payload.payment.entity;

        if (event === 'payment.captured' || event === 'order.paid') {
            const entryId = payload.order_id;
            const syncId = payload.id;
            const userId = payload.notes.userId;
            const amount = payload.amount / 100;

            const { data: record } = await supabase
                .from('payments')
                .select('status')
                .eq('transaction_id', entryId)
                .single();

            if (record && record.status === 'pending') {
                await supabase
                    .from('payments')
                    .update({ status: 'completed', transaction_id: syncId })
                    .eq('transaction_id', entryId);

                // Fetch full record to check type
                const { data: fullRecord } = await supabase
                    .from('payments')
                    .select('payment_type, amount')
                    .eq('transaction_id', entryId)
                    .single();

                if (fullRecord.payment_type === 'TOPUP') {
                    const { data: userProfile } = await supabase
                        .from('users')
                        .select('wallet_balance')
                        .eq('id', userId)
                        .single();

                    const currentBalance = Number(userProfile?.wallet_balance || 0);
                    const newBalance = currentBalance + Number(fullRecord.amount);

                    await supabase
                        .from('users')
                        .update({ wallet_balance: newBalance })
                        .eq('id', userId);
                } else {
                    const { data: metadata } = await supabase.from('settings').select('*');
                    const config = (metadata || []).reduce((acc, curr) => { acc[curr.key] = curr.value; return acc; }, {});
                    const durationDays = parseInt(config.subscription_duration_days || 30);

                    const { data: userProfile } = await supabase
                        .from('users')
                        .select('subscription_expires_at')
                        .eq('id', userId)
                        .single();

                    const currentExpiry = userProfile?.subscription_expires_at ? new Date(userProfile.subscription_expires_at) : new Date();
                    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                    const newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

                    await supabase
                        .from('users')
                        .update({ 
                            is_paid: true, 
                            subscription_expires_at: newExpiry.toISOString() 
                        })
                        .eq('id', userId);
                }
            }
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('Process Internal Error:', err.message);
        res.status(500).send('Internal Error');
    }
};

/**
 * Fetches user history.
 */
exports.getHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ history: data });
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({ message: 'Error fetching history' });
    }
};
