const supabase = require('../config/supabase');
const scoring = require('../utils/scoring');
const ocr = require('../utils/ocr');
const transcription = require('../utils/transcription');

// Supabase may return options as a Postgres array string e.g. '{opt1,opt2}'
// or already as a JS array. This helper always returns a proper JS array.
const parseOptions = (options) => {
    if (!options) return null;
    if (Array.isArray(options)) return options;
    // Postgres array literal format: {val1,val2,val3}
    if (typeof options === 'string' && options.startsWith('{') && options.endsWith('}')) {
        return options.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    }
    // JSON string format: ["val1","val2"]
    try { return JSON.parse(options); } catch { return [options]; }
};

exports.getAssessmentByLesson = async (req, res) => {
    const { lessonId } = req.params;
    try {
        console.log(`[Assessment] Querying assessments for lesson_id: ${lessonId}`);
        const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .select('*')
            .eq('lesson_id', lessonId)
            .maybeSingle(); // Better than .single() as it doesn't throw if 0 rows

        if (assessmentError) {
            console.error('Supabase Assessment Fetch Error:', assessmentError);
            throw assessmentError;
        }

        if (!assessment) {
            console.log(`No assessment found for lesson ${lessonId}`);
            return res.json({ assessment: null, questions: [] });
        }

        console.log(`Found assessment: ${assessment.id}. Fetching questions...`);

        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('assessment_id', assessment.id);

        if (questionsError) {
            console.error('Supabase Questions Fetch Error:', questionsError);
            throw questionsError;
        }

        console.log(`Found ${questions?.length || 0} questions.`);

        res.json({
            assessment,
            questions: (questions || []).map(q => ({
                id: q.id,
                text: q.question_text,
                type: q.question_type,
                options: parseOptions(q.options),
                correct_answer: q.correct_answer,
                points: q.points || 10,
                explanation: q.explanation
            }))
        });
    } catch (error) {
        console.error('Critical getAssessmentByLesson Catch:', error);
        res.status(500).json({
            message: 'Error fetching assessment',
            details: error.message || error.details || 'Unknown database error'
        });
    }
};

exports.submitAssessment = async (req, res) => {
    const userId = req.user?.id;
    const { assessmentId } = req.body;
    let answers = typeof req.body.answers === 'string' ? JSON.parse(req.body.answers) : req.body.answers;

    try {
        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('assessment_id', assessmentId);

        if (questionsError) throw questionsError;

        // Step 1: Process any media files (Voice/OCR)
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const questionId = file.fieldname.split('_')[1];
                const question = questions.find(q => q.id === questionId);

                if (question) {
                    let extractedText = "";
                    if (question.question_type === 'Voice') {
                        extractedText = await transcription.transcribeAudio(file.path);
                    } else if (question.question_type === 'Image') {
                        extractedText = await ocr.extractTextFromImage(file.path);
                    }
                    answers[questionId] = extractedText;
                }
            }
        }

        // Calculate score
        const { score, passed } = scoring.calculateScore(questions, answers);

        // Store result on Supabase
        const { data: result, error: resultError } = await supabase
            .from('assessment_results')
            .insert([{
                user_id: userId,
                assessment_id: assessmentId,
                score,
                passed
            }])
            .select()
            .single();

        if (resultError) throw resultError;

        // Update user streak on Supabase
        if (passed) {
            const { error: streakError } = await supabase.rpc('increment_streak', { user_id: userId });
            if (streakError) {
                // Fallback if RPC isn't defined yet, do manual update
                await supabase
                    .from('users')
                    .update({ streak_count: 5 /* This is a placeholder, naturally you'd fetch current first or use a trigger */ })
                    .eq('id', userId);
            }
        }

        res.json({
            message: 'Assessment submitted successfully via Supabase',
            result,
            processedAnswers: answers
        });
    } catch (error) {
        console.error("Submission Error:", error);
        res.status(500).json({ message: 'Error submitting assessment' });
    }
};

exports.upsertAssessment = async (req, res) => {
    const { lessonId } = req.params;
    const { title, questions } = req.body;
    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // 1. Upsert Assessment
        let assessment;
        const { data: existing, error: existingError } = await adminSupabase
            .from('assessments')
            .select('*')
            .eq('lesson_id', lessonId)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
            const { data, error } = await adminSupabase
                .from('assessments')
                .update({ title: title || 'Assessment' })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            assessment = data;
        } else {
            const { data, error } = await adminSupabase
                .from('assessments')
                .insert([{ lesson_id: lessonId, title: title || 'Assessment' }])
                .select()
                .single();
            if (error) throw error;
            assessment = data;
        }

        const assessmentId = assessment.id;

        // 2. Delete existing questions
        await adminSupabase
            .from('questions')
            .delete()
            .eq('assessment_id', assessmentId);

        // 3. Insert new questions (only if questions array is provided)
        if (questions && questions.length > 0) {
            const questionsToInsert = questions.map(q => {
                // Ensure options is strictly a JSON array (or null) for Supabase JSONB column
                let jsonOptions = null;
                if (q.options) {
                    jsonOptions = Array.isArray(q.options) ? q.options : [q.options];
                }

                return {
                    assessment_id: assessmentId,
                    question_text: q.text || q.question || q.prompt || 'New Question',
                    question_type: q.type || 'Text',
                    correct_answer: (q.correct_answer || q.answer || q.answer_placeholder || '').toString(),
                    options: jsonOptions,
                    points: q.points || 10,
                    explanation: q.explanation || q.hint || null
                };
            });

            const { error: questionsInsertError } = await adminSupabase
                .from('questions')
                .insert(questionsToInsert);

            if (questionsInsertError) {
                console.error('Questions Insert Error Details:', questionsInsertError);
                throw questionsInsertError;
            }
        }

        res.json({ message: 'Assessment and questions saved successfully on Supabase', assessmentId });
    } catch (error) {
        console.error("Upsert Assessment Catch Error:", error);
        res.status(500).json({
            message: 'Error saving assessment',
            details: error.message || error.details || 'Unknown database error'
        });
    }
};

exports.processMedia = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No media file provided' });
    }

    const { type } = req.body; // 'Voice' or 'Image'

    try {
        let extractedText = "";
        if (type === 'Voice') {
            extractedText = await transcription.transcribeAudio(req.file.path);
        } else if (type === 'Image') {
            extractedText = await ocr.extractTextFromImage(req.file.path);
        } else {
            return res.status(400).json({ message: 'Invalid media type' });
        }

        res.json({ text: extractedText });
    } catch (error) {
        console.error('processMedia error:', error);
        res.status(500).json({ message: 'Error processing media' });
    }
};
