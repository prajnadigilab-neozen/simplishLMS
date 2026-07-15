const supabase = require('../config/supabase');

async function updateCoupons() {
    console.log('--- Updating Seeded Coupon Codes in Supabase to be Unpredictable ---');

    const couponUpdates = [
        { oldCode: 'BETA50', newCode: 'BETA50-Y2K7' },
        { oldCode: 'STUDENT50', newCode: 'STUDENT50-X9W2' },
        { oldCode: 'SCHOOL60', newCode: 'SCHOOL60-A1Z8' },
        { oldCode: 'COLLEGE40', newCode: 'COLLEGE40-B3C4' },
        { oldCode: 'INST35', newCode: 'INST35-D5E6' },
        { oldCode: 'RURAL55', newCode: 'RURAL55-F7G8' },
        { oldCode: 'REFERRAL', newCode: 'REFERRAL-H9K0' },
        { oldCode: 'RENEW30', newCode: 'RENEW30-L1M2' },
        { oldCode: 'LAUNCH50', newCode: 'LAUNCH50-N3P4' },
        { oldCode: 'AMB100', newCode: 'AMB100-Q5R6' }
    ];

    for (const update of couponUpdates) {
        try {
            // First check if the old coupon code exists
            const { data: coupon, error: fetchError } = await supabase
                .from('discount_master')
                .select('id, coupon_code')
                .ilike('coupon_code', update.oldCode)
                .maybeSingle();

            if (fetchError) {
                console.error(`Error checking coupon ${update.oldCode}:`, fetchError.message);
                continue;
            }

            if (coupon) {
                console.log(`Found coupon ${coupon.coupon_code}. Updating to ${update.newCode}...`);
                const { error: updateError } = await supabase
                    .from('discount_master')
                    .update({ coupon_code: update.newCode, updated_at: new Date().toISOString() })
                    .eq('id', coupon.id);

                if (updateError) {
                    console.error(`❌ Failed to update ${coupon.coupon_code}:`, updateError.message);
                } else {
                    console.log(`✅ Successfully updated to ${update.newCode}`);
                }
            } else {
                console.log(`Coupon ${update.oldCode} not found (could already be updated).`);
            }
        } catch (err) {
            console.error(`Unexpected error for ${update.oldCode}:`, err.message);
        }
    }

    console.log('--- Coupon updates completed! ---');
}

updateCoupons().catch(err => {
    console.error('Fatal error in updater:', err);
});
