export type UserRole = 'student' | 'user' | 'moderator' | 'admin' | 'super_admin';

export interface User {
    id: string;
    email: string;
    phone?: string;
    full_name?: string;
    role: UserRole;
    status: 'active' | 'inactive' | 'deleted';
    wallet_balance: number;
    xp: number;
    streak_count: number;
    is_paid: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface UserUpdateData extends Partial<Omit<User, 'id' | 'created_at'>> {}

export interface Assessment {
    id: string;
    lesson_id: string;
    title: string;
    description?: string;
    total_score: number;
    passing_score: number;
    created_at?: string;
}

export interface Question {
    id: string;
    assessment_id: string;
    type: 'mcq' | 'matching' | 'short_answer';
    content: any; // JSON structure for MCQ or Matching
    points: number;
    order_index: number;
}

export interface AssessmentResult {
    id?: string;
    user_id: string;
    assessment_id: string;
    score: number;
    passed: boolean;
    created_at?: string;
}
