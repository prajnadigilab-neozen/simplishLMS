const assessmentService = require('../services/assessmentService').default;
const userService = require('../services/userService').default;
const lessonService = require('../services/lessonService');
const scoring = require('../utils/scoring');
const ocr = require('../utils/ocr');
const transcription = require('../utils/transcription');
const logger = require('../utils/logger');

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
        const assessment = await assessmentService.getAssessmentByLesson(lessonId);

        if (!assessment) {
            console.log(`No assessment found for lesson ${lessonId}`);
            return res.json({ assessment: null, questions: [] });
        }

        console.log(`Found assessment: ${assessment.id}. Fetching questions...`);
        const questions = await assessmentService.getQuestionsByAssessment(assessment.id);

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
            details: error.message || 'Unknown database error'
        });
    }
};

exports.submitAssessment = async (req, res) => {
    const userId = req.user?.id;
    const { assessmentId } = req.body;
    let answers = typeof req.body.answers === 'string' ? JSON.parse(req.body.answers) : req.body.answers;

    try {
        const questions = await assessmentService.getQuestionsByAssessment(assessmentId);

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

        // Store result via Service Layer
        const result = await assessmentService.saveResult({
            user_id: userId,
            assessment_id: assessmentId,
            score,
            passed
        });

        // Update user progress and streak via Service Layer
        if (passed) {
            await userService.incrementStreak(userId);
            
            // Mark the associated lesson as completed
            try {
                const assessment = await assessmentService.getAssessmentById(assessmentId);
                if (assessment?.lesson_id) {
                    // Record progress in database
                    await lessonService.updateProgress(userId, assessment.lesson_id, {
                        status: 'completed',
                        completion_percentage: 100
                    });
                    console.log(`[Assessment] Lesson ${assessment.lesson_id} marked as completed for user ${userId}`);
                }
            } catch (err) {
                console.error('Failed to update progress in assessment controller:', err);
                // Non-blocking for the assessment result itself
            }
        }

        res.json({
            message: 'Assessment submitted successfully',
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

    try {
        // 1. Upsert Assessment via Service Layer
        const assessment = await assessmentService.upsertAssessment({ 
            lesson_id: lessonId, 
            title: title || 'Assessment',
            updated_at: new Date().toISOString()
        });

        const assessmentId = assessment.id;

        // 2. Delete existing questions via Service Layer
        await assessmentService.deleteQuestions(assessmentId);

        // 3. Insert new questions (only if questions array is provided) via Service Layer
        if (questions && questions.length > 0) {
            const questionsToInsert = questions.map(q => {
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

            await assessmentService.insertQuestions(questionsToInsert);
        }

        res.json({ message: 'Assessment and questions saved successfully', assessmentId });
    } catch (error) {
        console.error("Upsert Assessment Catch Error:", error);
        res.status(500).json({
            message: 'Error saving assessment',
            details: error.message || 'Unknown database error'
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
