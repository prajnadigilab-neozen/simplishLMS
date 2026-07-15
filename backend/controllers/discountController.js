const discountService = require('../services/discountService');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Controller for all Coupon & Discount endpoints.
 */
const discountController = {
    /**
     * Validate a coupon code during checkout.
     */
    validateCoupon: async (req, res) => {
        const { coupon_code, purchase_type, original_price } = req.body;
        const userId = req.user.id;
        const userIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';

        if (!coupon_code || !purchase_type || original_price === undefined) {
            return res.status(400).json({ message: 'Missing required validation fields' });
        }

        try {
            // Log validation attempt for security and analytics (conversion rate calculation)
            await supabase.from('system_logs').insert([{
                admin_id: userId,
                event_type: 'COUPON_VALIDATE',
                severity: 'INFO',
                message: `Coupon validation request: ${coupon_code}`,
                metadata: {
                    user_id: userId,
                    coupon_code: coupon_code.toUpperCase(),
                    purchase_type,
                    original_price,
                    ip: userIp
                }
            }]);

            const result = await discountService.validateCoupon(
                coupon_code,
                userId,
                purchase_type,
                original_price
            );

            if (!result.valid) {
                return res.status(400).json({ success: false, valid: false, message: result.message });
            }

            res.json({ success: true, ...result });
        } catch (err) {
            logger.error({ err: err.message, userId }, 'Validate Coupon Error');
            res.status(500).json({ message: 'Error validating coupon', error: err.message });
        }
    },

    /**
     * Get list of all coupons (Admin only).
     */
    getCoupons: async (req, res) => {
        const { search, filterType, limit, offset } = req.query;

        try {
            const result = await discountService.getCoupons({
                search,
                filterType,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            });

            res.json(result);
        } catch (err) {
            logger.error({ err: err.message }, 'Get Coupons Error');
            res.status(500).json({ message: 'Error fetching coupons', error: err.message });
        }
    },

    /**
     * Create a new coupon manually (Admin only).
     */
    createCoupon: async (req, res) => {
        const couponData = req.body;
        const userId = req.user.id;
        const userIp = req.ip || 'unknown';

        try {
            // Force uppercase code
            if (couponData.coupon_code) {
                couponData.coupon_code = couponData.coupon_code.toUpperCase().trim();
            }
            couponData.created_by = userId;

            const newCoupon = await discountService.createCoupon(couponData);

            // Audit logging
            await supabase.from('system_logs').insert([{
                admin_id: userId,
                event_type: 'COUPON_CREATE',
                severity: 'INFO',
                message: `Coupon created manually: ${newCoupon.coupon_code}`,
                metadata: {
                    coupon_id: newCoupon.id,
                    coupon_code: newCoupon.coupon_code,
                    ip: userIp
                }
            }]);

            res.status(201).json({ success: true, coupon: newCoupon });
        } catch (err) {
            logger.error({ err: err.message }, 'Create Coupon Error');
            res.status(500).json({ message: 'Error creating coupon', error: err.message });
        }
    },

    /**
     * Update an existing coupon (Admin only).
     */
    updateCoupon: async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user.id;
        const userIp = req.ip || 'unknown';

        try {
            if (updateData.coupon_code) {
                updateData.coupon_code = updateData.coupon_code.toUpperCase().trim();
            }

            const updatedCoupon = await discountService.updateCoupon(id, updateData);

            // Audit logging
            await supabase.from('system_logs').insert([{
                admin_id: userId,
                event_type: 'COUPON_UPDATE',
                severity: 'INFO',
                message: `Coupon updated: ${updatedCoupon.coupon_code}`,
                metadata: {
                    coupon_id: id,
                    coupon_code: updatedCoupon.coupon_code,
                    ip: userIp
                }
            }]);

            res.json({ success: true, coupon: updatedCoupon });
        } catch (err) {
            logger.error({ err: err.message }, 'Update Coupon Error');
            res.status(500).json({ message: 'Error updating coupon', error: err.message });
        }
    },

    /**
     * Delete a coupon (Admin only).
     */
    deleteCoupon: async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const userIp = req.ip || 'unknown';

        try {
            // Get code before deleting for logging
            const { data: coupon } = await supabase
                .from('discount_master')
                .select('coupon_code')
                .eq('id', id)
                .maybeSingle();

            await discountService.deleteCoupon(id);

            // Audit logging
            await supabase.from('system_logs').insert([{
                admin_id: userId,
                event_type: 'COUPON_DELETE',
                severity: 'INFO',
                message: `Coupon deleted: ${coupon?.coupon_code || id}`,
                metadata: {
                    coupon_id: id,
                    coupon_code: coupon?.coupon_code,
                    ip: userIp
                }
            }]);

            res.json({ success: true, message: 'Coupon deleted successfully' });
        } catch (err) {
            logger.error({ err: err.message }, 'Delete Coupon Error');
            res.status(500).json({ message: 'Error deleting coupon', error: err.message });
        }
    },

    /**
     * Toggle active/inactive status (Admin only).
     */
    toggleCoupon: async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const userIp = req.ip || 'unknown';

        try {
            const { data: coupon } = await supabase
                .from('discount_master')
                .select('is_active, coupon_code')
                .eq('id', id)
                .single();

            const newStatus = !coupon.is_active;
            const updated = await discountService.updateCoupon(id, { is_active: newStatus });

            // Audit logging
            await supabase.from('system_logs').insert([{
                admin_id: userId,
                event_type: 'COUPON_UPDATE',
                severity: 'INFO',
                message: `Coupon status toggled to ${newStatus ? 'active' : 'inactive'}: ${coupon.coupon_code}`,
                metadata: {
                    coupon_id: id,
                    coupon_code: coupon.coupon_code,
                    is_active: newStatus,
                    ip: userIp
                }
            }]);

            res.json({ success: true, coupon: updated });
        } catch (err) {
            logger.error({ err: err.message }, 'Toggle Coupon Error');
            res.status(500).json({ message: 'Error toggling coupon state', error: err.message });
        }
    },

    /**
     * Clone an existing coupon (Admin only).
     */
    cloneCoupon: async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const userIp = req.ip || 'unknown';

        try {
            const { data: source } = await supabase
                .from('discount_master')
                .select('*')
                .eq('id', id)
                .single();

            if (!source) {
                return res.status(404).json({ message: 'Source coupon not found' });
            }

            // Create cloned payload
            const randomSuffix = Math.random().toString(36).substring(7).toUpperCase();
            const clonePayload = {
                customer_type: source.customer_type,
                coupon_code: `${source.coupon_code}-CLONE-${randomSuffix}`,
                discount_type: source.discount_type,
                discount_value: source.discount_value,
                description: `Clone of ${source.coupon_code} - ${source.description || ''}`,
                is_active: source.is_active,
                start_date: source.start_date,
                end_date: source.end_date,
                max_usage: source.max_usage,
                current_usage: 0,
                created_by: userId
            };

            const newCoupon = await discountService.createCoupon(clonePayload);

            // Audit logging
            await supabase.from('system_logs').insert([{
                admin_id: userId,
                event_type: 'COUPON_CREATE',
                severity: 'INFO',
                message: `Coupon cloned: ${source.coupon_code} -> ${newCoupon.coupon_code}`,
                metadata: {
                    source_id: id,
                    clone_id: newCoupon.id,
                    source_code: source.coupon_code,
                    clone_code: newCoupon.coupon_code,
                    ip: userIp
                }
            }]);

            res.json({ success: true, coupon: newCoupon });
        } catch (err) {
            logger.error({ err: err.message }, 'Clone Coupon Error');
            res.status(500).json({ message: 'Error cloning coupon', error: err.message });
        }
    },

    /**
     * Generate bulk coupon codes (Admin only).
     */
    generateBulk: async (req, res) => {
        const { customerType, prefix, quantity, discountType, discountValue, expiryDate, usageLimit } = req.body;
        const userId = req.user.id;
        const userIp = req.ip || 'unknown';

        try {
            const result = await discountService.generateBulkCoupons({
                customerType,
                prefix,
                quantity,
                discountType,
                discountValue,
                expiryDate,
                usageLimit,
                createdBy: userId
            });

            // Audit logging
            await supabase.from('system_logs').insert([{
                admin_id: userId,
                event_type: 'COUPON_BULK_GENERATE',
                severity: 'INFO',
                message: `Bulk coupon generation completed: ${result.count} coupons created with prefix: ${prefix}`,
                metadata: {
                    customer_type: customerType,
                    prefix: prefix.toUpperCase(),
                    quantity: result.count,
                    discount_type: discountType,
                    discount_value: discountValue,
                    ip: userIp
                }
            }]);

            res.status(201).json({ success: true, message: `Successfully generated ${result.count} coupons.`, count: result.count });
        } catch (err) {
            logger.error({ err: err.message }, 'Bulk Coupon Generation Error');
            res.status(500).json({ message: 'Error generating coupons in bulk', error: err.message });
        }
    },

    /**
     * Get coupon usage analytics (Admin only).
     */
    getAnalytics: async (req, res) => {
        try {
            const result = await discountService.getAnalytics();
            res.json(result);
        } catch (err) {
            logger.error({ err: err.message }, 'Get Coupon Analytics Error');
            res.status(500).json({ message: 'Error fetching analytics metrics', error: err.message });
        }
    },

    /**
     * Get coupon usage history logs (Admin only).
     */
    getHistory: async (req, res) => {
        const { limit, offset } = req.query;

        try {
            const result = await discountService.getUsageHistory({
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            });

            res.json(result);
        } catch (err) {
            logger.error({ err: err.message }, 'Get Coupon Usage History Error');
            res.status(500).json({ message: 'Error fetching usage history', error: err.message });
        }
    }
};

module.exports = discountController;
