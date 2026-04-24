const supabase = require('../config/supabase');

/**
 * Service to handle all Lesson and Progress-related database operations.
 */
const lessonService = {
    /**
     * Fetch all lessons, ordered by display_order.
     */
    getAllLessons: async () => {
        const { data, error } = await supabase
            .from('lessons')
            .select('*')
            .order('display_order', { ascending: true });
        if (error) throw error;
        return data;
    },

    /**
     * Fetch a single lesson by its ID.
     */
    getLessonById: async (id) => {
        const { data, error } = await supabase
            .from('lessons')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    /**
     * Upsert a lesson record.
     */
    upsertLesson: async (lessonData) => {
        const { data, error } = await supabase
            .from('lessons')
            .upsert(lessonData)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Delete a lesson.
     */
    deleteLesson: async (id) => {
        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    /**
     * Fetch all progress records for a specific user.
     */
    getUserProgress: async (userId) => {
        const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        return data;
    },

    /**
     * Update or create a progress record for a user and lesson.
     */
    updateProgress: async (userId, lessonId, progressData) => {
        try {
            if (!userId || !lessonId) {
                console.error('[LessonService] updateProgress called with missing IDs:', { userId, lessonId });
                throw new Error('User ID and Lesson ID are required for progress updates');
            }

            const { data, error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: userId,
                    lesson_id: lessonId,
                    ...progressData,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'user_id,lesson_id' 
                })
                .select()
                .single();
                
            if (error) {
                console.error(`[LessonService] Database error during updateProgress for user ${userId}, lesson ${lessonId}:`, error);
                throw error;
            }
            
            console.log(`[LessonService] Successfully updated progress for user ${userId}, lesson ${lessonId}`);
            return data;
        } catch (err) {
            console.error('[LessonService] Unexpected error in updateProgress:', err);
            throw err;
        }
    },

    /**
     * Clear all progress for a specific user.
     */
    clearUserProgress: async (userId) => {
        const { error } = await supabase
            .from('user_progress')
            .delete()
            .eq('user_id', userId);
        if (error) throw error;
        return true;
    },

    /**
     * Complex fetch: Get all lessons joined with user progress, assessments, and results.
     */
    getEnhancedLessonsProgress: async (userId) => {
        // 1. Fetch all lessons
        const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('*')
            .order('display_order', { ascending: true });
        if (lessonsError) throw lessonsError;

        // 2. Fetch user progress
        const { data: progressList, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId);
        if (progressError) throw progressError;

        // 3. Fetch all assessments
        const { data: allAssessments, error: asError } = await supabase
            .from('assessments')
            .select('id, lesson_id');
        if (asError) throw asError;

        // 4. Fetch assessment results for this user
        const { data: assessmentResults, error: assessmentError } = await supabase
            .from('assessment_results')
            .select('*')
            .eq('user_id', userId);
        if (assessmentError) throw assessmentError;

        return {
            lessons: lessons || [],
            progressList: progressList || [],
            allAssessments: allAssessments || [],
            assessmentResults: assessmentResults || []
        };
    }
};

module.exports = lessonService;
