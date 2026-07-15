const supabase = require('../config/supabase');
const crypto = require('crypto');

/**
 * Service to handle all Discount & Coupon-related database operations.
 */
const discountService = {
    /**
     * Validate a coupon code for a specific user and purchase.
     */
    validateCoupon: async (code, userId, purchaseType, originalPriceRupees) => {
        if (!code) {
            return { valid: false, message: 'Coupon code is required' };
        }

        // 1. Fetch coupon case-insensitively
        const { data: coupon, error } = await supabase
            .from('discount_master')
            .select('*')
            .ilike('coupon_code', code.trim())
            .maybeSingle();

        if (error) throw error;
        if (!coupon) {
            return { valid: false, message: 'Invalid Coupon Code' };
        }

        // 2. Check if active
        if (!coupon.is_active) {
            return { valid: false, message: 'Invalid Coupon Code' };
        }

        // 3. Check expiry dates
        const now = new Date();
        const start = new Date(coupon.start_date);
        const end = new Date(coupon.end_date);
        if (now < start || now > end) {
            return { valid: false, message: 'Coupon Expired' };
        }

        // 4. Check global usage limit
        if (coupon.current_usage >= coupon.max_usage) {
            return { valid: false, message: 'Usage limit reached' };
        }

        // 5. Check if user already used this coupon (prevent duplicate redemption)
        const { data: userUsages, error: usageError } = await supabase
            .from('user_discount_usage')
            .select('id')
            .eq('user_id', userId)
            .eq('coupon_id', coupon.id)
            .limit(1);

        if (usageError) throw usageError;
        if (userUsages && userUsages.length > 0) {
            return { valid: false, message: 'Already Used' };
        }

        // 6. Check purchase type compatibility
        const upperCode = coupon.coupon_code.toUpperCase();
        if (upperCode === 'RENEW30' && purchaseType !== 'RENEWAL') {
            return { valid: false, message: 'Coupon is only applicable for subscription renewals' };
        }

        // Calculations (Rupees)
        let discountAmountRupees = 0;
        let payableAmountRupees = Number(originalPriceRupees);

        if (coupon.discount_type === 'PERCENTAGE') {
            const pct = Number(coupon.discount_value);
            discountAmountRupees = Number((originalPriceRupees * (pct / 100)).toFixed(2));
            payableAmountRupees = Number((originalPriceRupees - discountAmountRupees).toFixed(2));
        } else if (coupon.discount_type === 'FREE_ACCESS') {
            discountAmountRupees = Number(originalPriceRupees);
            payableAmountRupees = 0;
        } else if (coupon.discount_type === 'FREE_MONTHS') {
            // Free months logic gives extra time, not price reduction
            discountAmountRupees = 0;
            payableAmountRupees = Number(originalPriceRupees);
        }

        if (payableAmountRupees < 0) {
            payableAmountRupees = 0;
        }

        return {
            valid: true,
            coupon,
            calculation: {
                original_price: Number(originalPriceRupees),
                discount_amount: discountAmountRupees,
                payable_amount: payableAmountRupees
            }
        };
    },

    /**
     * Retrieve all coupons with pagination, search, and filters.
     */
    getCoupons: async ({ search, filterType, limit = 50, offset = 0 }) => {
        let query = supabase
            .from('discount_master')
            .select('*', { count: 'exact' });

        if (search) {
            query = query.or(`coupon_code.ilike.%${search}%,customer_type.ilike.%${search}%`);
        }

        if (filterType) {
            query = query.eq('discount_type', filterType);
        }

        // Order by created_at desc
        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        return { coupons: data || [], total: count || 0 };
    },

    /**
     * Create a single coupon manually.
     */
    createCoupon: async (couponData) => {
        const { data, error } = await supabase
            .from('discount_master')
            .insert([couponData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing coupon.
     */
    updateCoupon: async (id, updateData) => {
        const { data, error } = await supabase
            .from('discount_master')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a coupon.
     */
    deleteCoupon: async (id) => {
        const { error } = await supabase
            .from('discount_master')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Increment coupon usage count.
     */
    incrementUsage: async (id) => {
        const { data: coupon, error: fetchErr } = await supabase
            .from('discount_master')
            .select('current_usage')
            .eq('id', id)
            .single();

        if (fetchErr) throw fetchErr;

        const { data, error } = await supabase
            .from('discount_master')
            .update({ current_usage: (coupon.current_usage || 0) + 1, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Record a user coupon usage entry.
     */
    recordUsage: async (usageData) => {
        const { data, error } = await supabase
            .from('user_discount_usage')
            .insert([usageData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Generate bulk coupon codes.
     */
    generateBulkCoupons: async ({ customerType, prefix, quantity, discountType, discountValue, expiryDate, usageLimit, createdBy }) => {
        if (!customerType || !prefix || !quantity || !discountType || discountValue === undefined) {
            throw new Error('Missing required bulk generation inputs');
        }

        const qty = parseInt(quantity);
        if (qty <= 0 || qty > 2000) {
            throw new Error('Quantity must be between 1 and 2000');
        }

        // Fetch existing coupon codes to prevent collisions
        const { data: existing, error: existingErr } = await supabase
            .from('discount_master')
            .select('coupon_code');

        if (existingErr) throw existingErr;
        const existingCodesSet = new Set((existing || []).map(c => c.coupon_code.toUpperCase()));

        const couponsToInsert = [];
        const generatedCodesInBatch = new Set();
        
        const cleanPrefix = prefix.trim().toUpperCase();

        const generateSecureCode = (pre) => {
            // Exclude easily confused characters: I, O, 0, 1
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let codeSuffix = '';
            // Generate 8 random characters to make it highly unique and unpredictable
            const bytes = crypto.randomBytes(8);
            for (let i = 0; i < 8; i++) {
                codeSuffix += chars[bytes[i] % chars.length];
            }
            return `${pre}-${codeSuffix}`;
        };

        for (let i = 0; i < qty; i++) {
            let code = generateSecureCode(cleanPrefix);
            let attempts = 0;
            // Regenerate if code exists globally or in current batch
            while ((existingCodesSet.has(code) || generatedCodesInBatch.has(code)) && attempts < 100) {
                code = generateSecureCode(cleanPrefix);
                attempts++;
            }
            if (attempts >= 100) {
                throw new Error('Code generation space exhausted, please use a different prefix');
            }
            
            generatedCodesInBatch.add(code);
            couponsToInsert.push({
                customer_type: customerType,
                coupon_code: code,
                discount_type: discountType,
                discount_value: Number(discountValue),
                description: `Auto-generated ${customerType} coupon`,
                is_active: true,
                start_date: new Date().toISOString(),
                end_date: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                max_usage: usageLimit || 1,
                current_usage: 0,
                created_by: createdBy
            });
        }

        // Insert in batches of 500 for safety
        const batchSize = 500;
        for (let i = 0; i < couponsToInsert.length; i += batchSize) {
            const batch = couponsToInsert.slice(i, i + batchSize);
            const { error: insertErr } = await supabase
                .from('discount_master')
                .insert(batch);
            
            if (insertErr) throw insertErr;
        }

        return { count: couponsToInsert.length };
    },

    /**
     * Fetch coupon analytics metrics.
     */
    getAnalytics: async () => {
        // 1. Total Coupons Created
        const { count: totalCreated, error: createdErr } = await supabase
            .from('discount_master')
            .select('*', { count: 'exact', head: true });

        if (createdErr) throw createdErr;

        // 2. Total Usage Records
        const { data: usages, error: usagesErr } = await supabase
            .from('user_discount_usage')
            .select('discount_amount, final_amount, customer_type, coupon_code');

        if (usagesErr) throw usagesErr;

        const totalUsed = usages ? usages.length : 0;

        // 3. Financial Metrics
        let revenueLost = 0;
        let revenueGenerated = 0;
        const customerDist = {};
        const couponPerformance = {};

        if (usages) {
            usages.forEach(u => {
                revenueLost += Number(u.discount_amount || 0);
                revenueGenerated += Number(u.final_amount || 0);

                // Distribution by customer type
                customerDist[u.customer_type] = (customerDist[u.customer_type] || 0) + 1;

                // Top performing coupons
                couponPerformance[u.coupon_code] = (couponPerformance[u.coupon_code] || 0) + 1;
            });
        }

        const topCoupons = Object.entries(couponPerformance)
            .map(([code, count]) => ({ code, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 4. Conversion Rate
        // Fetch validation event counts from system_logs (event_type: 'COUPON_VALIDATE')
        const { count: totalValidations, error: logsErr } = await supabase
            .from('system_logs')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'COUPON_VALIDATE');
        
        let conversionRate = 0;
        if (!logsErr && totalValidations && totalValidations > 0) {
            conversionRate = Number(((totalUsed / totalValidations) * 100).toFixed(1));
        } else {
            // fallback: conversion based on created vs used if no logs exist
            conversionRate = totalCreated > 0 ? Number(((totalUsed / totalCreated) * 100).toFixed(1)) : 0;
        }

        return {
            couponsCreated: totalCreated || 0,
            couponsUsed: totalUsed,
            revenueLost: Number(revenueLost.toFixed(2)),
            revenueGenerated: Number(revenueGenerated.toFixed(2)),
            topCoupons,
            conversionRate,
            customerDistribution: Object.entries(customerDist).map(([type, count]) => ({ type, count }))
        };
    },

    /**
     * Fetch complete audit usage history.
     */
    getUsageHistory: async ({ limit = 50, offset = 0 }) => {
        const { data, count, error } = await supabase
            .from('user_discount_usage')
            .select('*, users(full_name, email)')
            .order('used_on', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { history: data || [], total: count || 0 };
    }
};

module.exports = discountService;
