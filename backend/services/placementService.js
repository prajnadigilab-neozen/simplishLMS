const supabase = require('../config/supabase');

/**
 * Service to handle all Placement-related database operations.
 */
const placementService = {
    /**
     * Fetch placement questions by level.
     */
    getQuestionsByLevel: async (level, limit = 2) => {
        const { data, error } = await supabase
            .from('placement_questions')
            .select('id, question_text, options, difficulty_level')
            .eq('difficulty_level', level)
            .limit(limit);
        if (error) throw error;
        return data;
    },

    /**
     * Fetch specific questions by their IDs.
     */
    getQuestionsByIds: async (ids) => {
        const { data, error } = await supabase
            .from('placement_questions')
            .select('id, correct_answer, difficulty_level')
            .in('id', ids);
        if (error) throw error;
        return data;
    },

    /**
     * Save placement test results for a user.
     */
    saveResult: async (userId, resultData) => {
        const { data, error } = await supabase
            .from('placement_results')
            .upsert({
                user_id: userId,
                ...resultData,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Fetch a balanced set of adaptive placement questions (2 from each level).
     */
    getAdaptiveQuestions: async () => {
        const levels = ['Basic', 'Intermediate', 'Advanced', 'Expert'];
        const results = await Promise.all(
            levels.map(lvl => 
                supabase
                    .from('placement_questions')
                    .select('id, question_text, options, difficulty_level')
                    .eq('difficulty_level', lvl)
                    .limit(2)
            )
        );

        // Flatten results and check for errors
        const questions = [];
        for (const res of results) {
            if (res.error) throw res.error;
            if (res.data) questions.push(...res.data);
        }
        return questions;
    },

    /**
     * Fetch placement leaderboard from placement_results joined with users.
     */
    getLeaderboard: async (limit = 10) => {
        const { data, error } = await supabase
            .from('placement_results')
            .select(`
                id,
                score_percentage,
                assigned_level,
                completed_at,
                users (
                    full_name,
                    avatar_url
                )
            `)
            .order('score_percentage', { ascending: false })
            .order('completed_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};

module.exports = placementService;
