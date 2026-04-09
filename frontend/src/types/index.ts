export type UserRole = 'student' | 'user' | 'moderator' | 'admin' | 'super_admin';

export interface User {
    id: string;
    email: string;
    full_name?: string;
    role: UserRole;
    status: 'active' | 'inactive' | 'deleted';
    wallet_balance: number;
    xp: number;
    streak_days: number;
    is_paid: boolean;
    last_login_at?: string;
    created_at?: string;
}

export type QuestionType = 'MCQ' | 'Text' | 'Voice' | 'Image' | 'Matching';

export interface MatchingPair {
    english: string;
    kannada: string;
}

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options?: string[] | string;
    pairs?: MatchingPair[];
    correct_answer: string;
    explanation?: string;
    media_url?: string;
}

export interface Assessment {
    id: string;
    lesson_id: string;
    title: string;
    description?: string;
    passing_score: number;
    questions?: Question[];
}

export interface Lesson {
    id: string;
    title: string;
    description?: string;
    level: 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';
    topic?: string;
    display_order: number;
    video_url?: string;
    pdf_url?: string;
    audio_url?: string;
    content?: any;
}
