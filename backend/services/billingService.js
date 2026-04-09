const supabase = require('../config/supabase');

/**
 * Service to handle all Billing-related database operations.
 */
const billingService = {
    /**
     * Fetch store settings (dynamic pricing, configs).
     */
    getSettings: async () => {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;
        // Format to key-value map for convenience
        return (data || []).reduce((acc, curr) => { 
            if (curr.key && curr.value) acc[curr.key] = curr.value; 
            return acc; 
        }, {});
    },

    /**
     * Create a new payment record.
     */
    createPayment: async (paymentData) => {
        const { data, error } = await supabase
            .from('payments')
            .insert([paymentData])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Fetch a payment record by its transaction ID.
     */
    getPaymentByTransactionId: async (txnId) => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', txnId)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    /**
     * Update an existing payment record.
     */
    updatePayment: async (txnId, updateData) => {
        const { data, error } = await supabase
            .from('payments')
            .update(updateData)
            .eq('transaction_id', txnId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Bulk update logic for payment failures.
     */
    failPayment: async (txnId) => {
        const { error } = await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('transaction_id', txnId);
        if (error) throw error;
        return true;
    },

    /**
     * Verify payment status is 'completed' for a txn.
     */
    isPaymentCompleted: async (txnId) => {
        const { data, error } = await supabase
            .from('payments')
            .select('status')
            .eq('transaction_id', txnId)
            .single();
        if (error) throw error;
        return data?.status === 'completed';
    },

    /**
     * Fetch all payment records for a user.
     */
    getUserPayments: async (userId) => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    /**
     * Bulk update key-value platform settings.
     */
    updateSettings: async (updates) => {
        const { error } = await supabase
            .from('settings')
            .upsert(updates, { onConflict: 'key' });
        if (error) throw error;
        return true;
    }
};

module.exports = billingService;
