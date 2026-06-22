// Register ts-node programmatically to compile TypeScript on-the-fly
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: "commonjs",
        moduleResolution: "node",
        ignoreDeprecations: "6.0"
    }
});

const assert = require('assert');
const feedbackService = require('../services/feedbackService').default;
const supabase = require('../config/supabase');

// Backup the original client function
const originalFrom = supabase.from;

let mockFromHandler = null;
supabase.from = (table) => {
    if (mockFromHandler) return mockFromHandler(table);
    return originalFrom(table);
};

async function testSaveFeedbackSuccess() {
    console.log('Testing saveFeedback (Success Path)...');
    const mockFeedback = {
        id: 'feedback-123',
        user_id: 'user-123',
        exam_id: 'exam-123',
        rating: 5,
        feedback_tags: ['Question Clarity'],
        comments: 'Great exam!'
    };

    mockFromHandler = (table) => {
        assert.strictEqual(table, 'exam_feedback');
        return {
            insert: (data) => {
                assert.deepStrictEqual(data, [{
                    user_id: 'user-123',
                    exam_id: 'exam-123',
                    rating: 5,
                    feedback_tags: ['Question Clarity'],
                    comments: 'Great exam!'
                }]);
                return {
                    select: () => ({
                        single: async () => ({ data: mockFeedback, error: null })
                    })
                };
            }
        };
    };

    const result = await feedbackService.saveFeedback({
        user_id: 'user-123',
        exam_id: 'exam-123',
        rating: 5,
        feedback_tags: ['Question Clarity'],
        comments: 'Great exam!'
    });

    assert.deepStrictEqual(result, mockFeedback);
    console.log('✅ saveFeedback (Success Path) passed.');
}

async function testSaveFeedbackDuplicate() {
    console.log('Testing saveFeedback (Duplicate Constraint)...');
    mockFromHandler = (table) => {
        assert.strictEqual(table, 'exam_feedback');
        return {
            insert: (data) => {
                return {
                    select: () => ({
                        single: async () => ({
                            data: null,
                            error: { code: '23505', message: 'duplicate key value violates unique constraint' }
                        })
                    })
                };
            }
        };
    };

    try {
        await feedbackService.saveFeedback({
            user_id: 'user-123',
            exam_id: 'exam-123',
            rating: 5
        });
        assert.fail('Should have thrown an error');
    } catch (err) {
        assert.strictEqual(err.code, 'DUPLICATE_SUBMISSION');
        assert.strictEqual(err.message, 'Feedback already submitted for this exam');
        console.log('✅ saveFeedback (Duplicate Constraint) passed.');
    }
}

async function testGetAverageRating() {
    console.log('Testing getAverageRating...');
    const mockRatings = [{ rating: 5 }, { rating: 4 }, { rating: 3 }];
    
    mockFromHandler = (table) => {
        assert.strictEqual(table, 'exam_feedback');
        return {
            select: (cols) => {
                assert.strictEqual(cols, 'rating');
                return {
                    eq: async (col, val) => {
                        assert.strictEqual(col, 'exam_id');
                        assert.strictEqual(val, 'exam-123');
                        return { data: mockRatings, error: null };
                    }
                };
            }
        };
    };

    const result = await feedbackService.getAverageRating('exam-123');
    assert.deepStrictEqual(result, {
        average_rating: 4.00,
        total_responses: 3
    });
    console.log('✅ getAverageRating passed.');
}

async function runAll() {
    try {
        await testSaveFeedbackSuccess();
        await testSaveFeedbackDuplicate();
        await testGetAverageRating();
        console.log('\n🎉 ALL FEEDBACK SERVICE UNIT TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed:', err);
        process.exit(1);
    } finally {
        // Restore original function
        supabase.from = originalFrom;
    }
}

runAll();
