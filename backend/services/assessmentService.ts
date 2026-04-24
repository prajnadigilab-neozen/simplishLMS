import supabase from '../config/supabase';
import { Assessment, Question, AssessmentResult } from '../types';

/**
 * Service to handle all Assessment and Question-related database operations.
 */
const assessmentService = {
    /**
     * Fetch assessment metadata for a lesson.
     */
    getAssessmentByLesson: async (lessonId: string): Promise<Assessment | null> => {
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('lesson_id', lessonId)
            .maybeSingle();
        if (error) throw error;
        return data as Assessment | null;
    },

    /**
     * Fetch assessment by its ID.
     */
    getAssessmentById: async (assessmentId: string): Promise<Assessment | null> => {
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('id', assessmentId)
            .maybeSingle();
        if (error) throw error;
        return data as Assessment | null;
    },

    /**
     * Fetch all questions for a given assessment.
     */
    getQuestionsByAssessment: async (assessmentId: string): Promise<Question[]> => {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('assessment_id', assessmentId);
        if (error) throw error;
        return (data as Question[]) || [];
    },

    /**
     * Create or update an assessment record (upsert).
     */
    upsertAssessment: async (assessmentData: Partial<Assessment>): Promise<Assessment> => {
        const { data, error } = await supabase
            .from('assessments')
            .upsert(assessmentData)
            .select()
            .single();
        if (error) throw error;
        return data as Assessment;
    },

    /**
     * Delete all questions associated with an assessment.
     */
    deleteQuestions: async (assessmentId: string): Promise<boolean> => {
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('assessment_id', assessmentId);
        if (error) throw error;
        return true;
    },

    /**
     * Insert new questions for an assessment.
     */
    insertQuestions: async (questions: Partial<Question>[]): Promise<boolean> => {
        const { error } = await supabase
            .from('questions')
            .insert(questions);
        if (error) throw error;
        return true;
    },

    /**
     * Save assessment results for a user.
     */
    saveResult: async (resultData: AssessmentResult): Promise<AssessmentResult> => {
        const { data, error } = await supabase
            .from('assessment_results')
            .insert([resultData])
            .select()
            .single();
        if (error) throw error;
        return data as AssessmentResult;
    },

    /**
     * Fetch user's previous results for a specific assessment.
     */
    getUserResults: async (userId: string, assessmentId: string): Promise<AssessmentResult[]> => {
        const { data, error } = await supabase
            .from('assessment_results')
            .select('*')
            .eq('user_id', userId)
            .eq('assessment_id', assessmentId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data as AssessmentResult[]) || [];
    }
};

export default assessmentService;
