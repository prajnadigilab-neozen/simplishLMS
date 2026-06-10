const supabase = require('../config/supabase');

async function main() {
    try {
        const userId = 'd65eccd1-eb04-407a-a734-f7153903f10c';
        const lessonId = '78757345-fd3b-4ee8-befb-eb7f75ae7781';
        
        console.log(`Updating user_progress score to 100 for userId: ${userId}, lessonId: ${lessonId}`);
        const { data, error } = await supabase
            .from('user_progress')
            .update({ score: 100 })
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .select()
            .single();

        if (error) throw error;

        console.log('Successfully updated progress record:', JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('Error updating score:', err);
    }
}

main();
