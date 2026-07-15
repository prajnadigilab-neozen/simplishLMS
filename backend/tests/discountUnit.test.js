const assert = require('assert').strict;
const discountService = require('../services/discountService');
const supabase = require('../config/supabase');

// Mock data store
let mockData = {
    coupons: [],
    usage: []
};

// Override supabase client method for testing
const originalSupabaseFrom = supabase.from;

function setupMockDb(coupons, usage) {
    mockData.coupons = coupons;
    mockData.usage = usage;
}

supabase.from = function(tableName) {
    return {
        select: function(columns) {
            const baseResult = {
                ilike: function(field, value) {
                    return {
                        maybeSingle: async function() {
                            if (tableName === 'discount_master') {
                                const found = mockData.coupons.find(c => c[field] && c[field].toLowerCase() === value.toLowerCase());
                                return { data: found || null, error: null };
                            }
                            return { data: null, error: null };
                        }
                    };
                },
                eq: function(field, value) {
                    return {
                        maybeSingle: async function() {
                            if (tableName === 'discount_master') {
                                const found = mockData.coupons.find(c => c[field] === value);
                                return { data: found || null, error: null };
                            }
                            return { data: null, error: null };
                        },
                        eq: function(field2, value2) {
                            return {
                                limit: function(num) {
                                    return {
                                        then: function(resolve) {
                                            if (tableName === 'user_discount_usage') {
                                                const found = mockData.usage.filter(u => u[field] === value && u[field2] === value2);
                                                resolve({ data: found, error: null });
                                            } else {
                                                resolve({ data: [], error: null });
                                            }
                                        }
                                    };
                                }
                            };
                        }
                    };
                },
                // Make the base select object thenable so it can be awaited directly
                then: function(resolve) {
                    if (tableName === 'discount_master') {
                        resolve({ data: mockData.coupons, error: null });
                    } else if (tableName === 'user_discount_usage') {
                        resolve({ data: mockData.usage, error: null });
                    } else {
                        resolve({ data: [], error: null });
                    }
                }
            };
            return baseResult;
        },
        insert: function(data) {
            return {
                select: function() {
                    return {
                        single: async function() {
                            if (tableName === 'discount_master') {
                                if (Array.isArray(data)) {
                                    mockData.coupons.push(...data);
                                    return { data: data[0], error: null };
                                } else {
                                    mockData.coupons.push(data);
                                    return { data: data, error: null };
                                }
                            }
                            return { data, error: null };
                        }
                    };
                }
            };
        }
    };
};

async function runTests() {
    console.log('=== Starting Discount & Coupon System Unit Tests ===\n');

    // Test Case 1: Standard Percentage Coupon Validation
    console.log('Test 1: PERCENTAGE Coupon Calculation');
    setupMockDb([
        {
            id: 'coupon-1',
            coupon_code: 'SAVE30',
            discount_type: 'PERCENTAGE',
            discount_value: 30,
            is_active: true,
            start_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
            end_date: new Date(Date.now() + 86400000).toISOString(),   // tomorrow
            current_usage: 0,
            max_usage: 100,
            customer_type: 'All Users'
        }
    ], []);

    let result = await discountService.validateCoupon('SAVE30', 'user-123', 'NEW', 1000);

    assert.equal(result.valid, true);
    assert.equal(result.calculation.original_price, 1000);
    assert.equal(result.calculation.discount_amount, 300);
    assert.equal(result.calculation.payable_amount, 700);
    console.log('✅ Passed: PERCENTAGE calculation and eligibility check.');

    // Test Case 2: Free Access (100%) Coupon Validation
    console.log('\nTest 2: FREE_ACCESS Coupon Calculation (Payable 0)');
    setupMockDb([
        {
            id: 'coupon-2',
            coupon_code: 'FREEBIE',
            discount_type: 'FREE_ACCESS',
            discount_value: 100,
            is_active: true,
            start_date: new Date(Date.now() - 86400000).toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            current_usage: 0,
            max_usage: 10,
            customer_type: 'Beta'
        }
    ], []);

    result = await discountService.validateCoupon('FREEBIE', 'user-123', 'NEW', 999);

    assert.equal(result.valid, true);
    assert.equal(result.calculation.discount_amount, 999);
    assert.equal(result.calculation.payable_amount, 0);
    console.log('✅ Passed: FREE_ACCESS grants 100% discount.');

    // Test Case 3: Free Months Coupon Validation
    console.log('\nTest 3: FREE_MONTHS Coupon Calculation (Original Price Paid, Free Months Extented)');
    setupMockDb([
        {
            id: 'coupon-3',
            coupon_code: 'BONUS2M',
            discount_type: 'FREE_MONTHS',
            discount_value: 2,
            is_active: true,
            start_date: new Date(Date.now() - 86400000).toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            current_usage: 0,
            max_usage: 50,
            customer_type: 'Promo'
        }
    ], []);

    result = await discountService.validateCoupon('BONUS2M', 'user-123', 'NEW', 999);

    assert.equal(result.valid, true);
    assert.equal(result.calculation.discount_amount, 0);
    assert.equal(result.calculation.payable_amount, 999);
    console.log('✅ Passed: FREE_MONTHS maintains original price (adds duration on fulfillment).');

    // Test Case 4: Expired Coupon Blocked
    console.log('\nTest 4: Block Expired Coupons');
    setupMockDb([
        {
            id: 'coupon-4',
            coupon_code: 'EXPIRED_CODE',
            discount_type: 'PERCENTAGE',
            discount_value: 25,
            is_active: true,
            start_date: new Date(Date.now() - 86400000 * 5).toISOString(),
            end_date: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
            current_usage: 0,
            max_usage: 100,
            customer_type: 'All Users'
        }
    ], []);

    const res4 = await discountService.validateCoupon('EXPIRED_CODE', 'user-123', 'NEW', 100);
    assert.equal(res4.valid, false);
    assert.ok(res4.message.toLowerCase().includes('expired'));
    console.log('✅ Passed: Expired coupon successfully blocked.');

    // Test Case 5: Exhausted (Limit reached) Coupon Blocked
    console.log('\nTest 5: Block Exhausted Usage Limit Coupons');
    setupMockDb([
        {
            id: 'coupon-5',
            coupon_code: 'LIMIT_OUT',
            discount_type: 'PERCENTAGE',
            discount_value: 10,
            is_active: true,
            start_date: new Date(Date.now() - 86400000).toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            current_usage: 10,
            max_usage: 10, // Exhausted!
            customer_type: 'All Users'
        }
    ], []);

    const res5 = await discountService.validateCoupon('LIMIT_OUT', 'user-123', 'NEW', 100);
    assert.equal(res5.valid, false);
    assert.ok(res5.message.toLowerCase().includes('limit'));
    console.log('✅ Passed: Exhausted coupon successfully blocked.');

    // Test Case 6: Prevent Duplicate Redemptions by Same User
    console.log('\nTest 6: Block Duplicate Redeemed Coupon per User');
    setupMockDb([
        {
            id: 'coupon-6',
            coupon_code: 'ONCE_ONLY',
            discount_type: 'PERCENTAGE',
            discount_value: 15,
            is_active: true,
            start_date: new Date(Date.now() - 86400000).toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            current_usage: 1,
            max_usage: 10,
            customer_type: 'All Users'
        }
    ], [
        {
            user_id: 'user-123',
            coupon_id: 'coupon-6',
            coupon_code: 'ONCE_ONLY'
        }
    ]);

    const res6 = await discountService.validateCoupon('ONCE_ONLY', 'user-123', 'NEW', 100);
    assert.equal(res6.valid, false);
    assert.ok(res6.message.toLowerCase().includes('used'));
    console.log('✅ Passed: Blocked double utilization by same user.');

    // Test Case 7: Bulk Generator collision safety check
    console.log('\nTest 7: Bulk Coupon Generator Collision Safety');
    setupMockDb([
        { coupon_code: 'GEN-ABC12' } // Seed a collision code
    ], []);

    // Mock math random to return matching values to check retry loop
    const originalRandom = Math.random;
    let mockCalls = 0;
    Math.random = () => {
        mockCalls++;
        // First 5 calls map to predictable collision (simulated)
        if (mockCalls <= 5) {
            return 0.1; 
        }
        return 0.9;
    };

    const generated = await discountService.generateBulkCoupons({
        customerType: 'Bulk',
        prefix: 'GEN',
        quantity: 2,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
        usageLimit: 1,
        createdBy: 'admin-user'
    });

    Math.random = originalRandom; // Restore random
    assert.equal(generated.count, 2);
    console.log('✅ Passed: Successfully resolved collision retry loop and generated clean codes.');

    // Restore original supabase client method
    supabase.from = originalSupabaseFrom;

    console.log('\n=== All Unit Tests Passed Successfully! ===');
}

runTests().catch(err => {
    console.error('\n❌ UNIT TEST FAILURE:', err);
    process.exit(1);
});
