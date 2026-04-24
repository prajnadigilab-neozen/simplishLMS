const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    const userId = 'b96e5ee4-5404-4855-bd05-eb202dd81287'; // From the error log provided by user
    const lessonId = 'c40a71fe-24a2-49e0-acdc-42960682e925';

    console.log('Testing progress update for user:', userId);
    
    // 1. Try to upsert progress
    const { data, error } = await supabase
        .from('user_progress')
        .upsert({
            user_id: userId,
            lesson_id: lessonId,
            status: 'completed',
            completion_percentage: 100,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' })
        .select()
        .single();

    if (error) {
        console.error('Update FAILED:', error);
    } else {
        console.log('Update SUCCESSFUL:', data);
    }
}

testUpdate();
