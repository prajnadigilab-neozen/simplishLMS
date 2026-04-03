-- ==========================================
-- SIMPLISH LMS: DATABASE ARCHITECTURE
-- PostgreSQL Focus: Normalized Schema
-- ==========================================

/*
  LOGIC EXPLANATION:
  1. Normalization: We split data into specialized tables (Users, Lessons, Assessments) to:
     - Reduce data redundancy (don't repeat teacher info in every lesson).
     - Ensure data integrity (delete a user, and their progress is automatically handled via CASCADE).
  2. One-to-Many Relationship:
     - A Lesson can have many Questions.
     - A Course can have many Lessons.
     - We handle this by adding a 'lesson_id' foreign key to the 'questions' table.
  3. Security & Best Practices:
     - Use UUIDs instead of sequential IDs to prevent "ID scraping" attacks.
     - Use 'TIMESTAMPTZ' to handle global timezones correctly.
     - Store password hashes (handled in app logic, but column is defined here).
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
-- Stores profile and authentication metadata
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE, -- Nullable for phone-only registrations
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL, -- Never store plain text
    role TEXT CHECK (role IN ('student', 'admin', 'moderator', 'super_admin')) DEFAULT 'student',
    streak_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, inactive, deleted
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    deleted_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LESSONS TABLE
-- Supports multimedia (PDF, Audio, Video) via file references or URLs
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    level TEXT CHECK (level IN ('Basic', 'Intermediate', 'Advanced', 'Expert')) NOT NULL,
    media_type TEXT CHECK (media_type IN ('pdf', 'audio', 'video', 'image')) NOT NULL,
    media_url TEXT NOT NULL, -- Path to cloud storage (S3/Supabase)
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ASSESSMENTS TABLE (Parent)
-- Groups questions into a single quiz/test
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    passing_score INTEGER DEFAULT 80,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id) -- One assessment per lesson for simple structure
);

-- 4. QUESTIONS TABLE (The "Many" in One-to-Many)
-- Handles multiple types: MCQ, Text, Voice, Image (OCR)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT CHECK (question_type IN ('MCQ', 'Text', 'Voice', 'Image')) NOT NULL,
    correct_answer TEXT, -- For MCQ or Text
    options JSONB, -- Valid only for MCQ; store as array ["A", "B", "C"]
    points INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USER PROGRESS TABLE
-- Tracks completion percentages and scores
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('started', 'completed')) DEFAULT 'started',
    completion_percentage INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- 6. ASSESSMENT RESULTS TABLE
CREATE TABLE assessment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAYMENTS TABLE
-- Stores mock transaction records
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    transaction_id TEXT UNIQUE,
    provider TEXT DEFAULT 'mock_gateway',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_lessons_level ON lessons(level);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_questions_assessment ON questions(assessment_id);
