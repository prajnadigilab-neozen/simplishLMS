import supabase from '../config/supabase';
import { ExamFeedback } from '../types';

/**
 * Service to handle all Exam Feedback database operations.
 */
const feedbackService = {
    /**
     * Persist feedback from a student after exam completion.
     */
    saveFeedback: async (feedbackData: ExamFeedback): Promise<ExamFeedback> => {
        const { data, error } = await supabase
            .from('exam_feedback')
            .insert([feedbackData])
            .select()
            .single();
            
        if (error) {
            // Check for Postgres Unique Constraint violation (23505)
            // or equivalent error from Supabase to ensure idempotency.
            if (error.code === '23505' || error.message?.includes('duplicate key value')) {
                const dupError = new Error('Feedback already submitted for this exam');
                (dupError as any).code = 'DUPLICATE_SUBMISSION';
                throw dupError;
            }
            throw error;
        }
        return data as ExamFeedback;
    },

    /**
     * Retrieve aggregated average rating and response count for an exam.
     */
    getAverageRating: async (examId: string): Promise<{ average_rating: number; total_responses: number }> => {
        const { data, error } = await supabase
            .from('exam_feedback')
            .select('rating')
            .eq('exam_id', examId);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return { average_rating: 0, total_responses: 0 };
        }
        
        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        const average = parseFloat((sum / data.length).toFixed(2));
        
        return {
            average_rating: average,
            total_responses: data.length
        };
    },

    /**
     * Fetch all feedback entries for a specific exam.
     */
    getFeedbackByExam: async (examId: string): Promise<ExamFeedback[]> => {
        const { data, error } = await supabase
            .from('exam_feedback')
            .select('*')
            .eq('exam_id', examId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return (data as ExamFeedback[]) || [];
    },

    /**
     * Fetch all feedback entries with related user name and assessment title.
     */
    getAllFeedback: async (): Promise<any[]> => {
        const { data, error } = await supabase
            .from('exam_feedback')
            .select(`
                *,
                users (
                    full_name
                ),
                assessments (
                    title
                )
            `)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }
};

export default feedbackService;
