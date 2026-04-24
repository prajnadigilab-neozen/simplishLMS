const path = require('path');
const logger = require('../utils/logger');
const lessonService = require('../services/lessonService');
const mediaService = require('../services/mediaService');

// 🛡️ SRE Caching Strategy: Global Lesson List Cache (TTL 5 mins)
let lessonCache = {
    data: null,
    expiresAt: 0
};
const CACHE_TTL = 5 * 60 * 1000;

// 🛡️ SRE CDN Helper: Prepend CDN_URL to relative paths if configured
const CDN_URL = process.env.CDN_URL ? process.env.CDN_URL.replace(/\/$/, '') : '';
const formatUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return CDN_URL ? (CDN_URL + url) : url;
};

// 🛡️ SRE Pre-warming: Populate cache manually on startup
exports.preWarmCache = async () => {
    try {
        logger.info('[SRE] Pre-warming Lesson Cache...');
        const data = await lessonService.getAllLessons();
        lessonCache.data = data;
        lessonCache.expiresAt = Date.now() + CACHE_TTL;
        logger.info(`[SRE] Cache Ready (${data.length} lessons)`);
    } catch (err) {
        logger.error({ err }, '[SRE] Pre-warm Failed');
    }
};

exports.uploadLesson = async (req, res) => {
    const { title, description, level, displayOrder, content } = req.body;

    const pdfUrl = req.files?.pdf ? `/uploads/${req.files.pdf[0].filename}` : req.body.pdfUrl || null;
    const audioUrl = req.files?.audio ? `/uploads/${req.files.audio[0].filename}` : req.body.audioUrl || null;
    const videoUrl = req.files?.video ? `/uploads/${req.files.video[0].filename}` : req.body.videoUrl || null;
    const transcription = req.body.transcription || null;

    if (!title || !level) {
        return res.status(400).json({ message: 'Title and level are strictly required.' });
    }

    try {
        const data = await lessonService.upsertLesson({
            title,
            description,
            level,
            media_type: 'mixed',
            media_url: pdfUrl || audioUrl || videoUrl,
            pdf_url: pdfUrl,
            audio_url: audioUrl,
            video_url: videoUrl,
            transcription: transcription,
            content: content ? (typeof content === 'string' ? JSON.parse(content) : content) : {},
            display_order: parseInt(req.body.displayOrder) || 0,
            module_title: (req.body.moduleTitle && req.body.moduleTitle.toLowerCase() !== 'general') ? req.body.moduleTitle : null,
            unit_number: parseInt(req.body.unitNumber) || 1
        });

        res.status(201).json({
            message: 'Lesson created successfully',
            lesson: data
        });
    } catch (error) {
        logger.error({ error }, "Lesson Upload Error");
        res.status(500).json({
            message: 'Error creating lesson',
            details: error.message || 'Unknown database error'
        });
    }
};

exports.getAllLessons = async (req, res) => {
    try {
        const data = await lessonService.getAllLessons();

        // Apply CDN formatting
        const formattedData = data.map(lesson => ({
            ...lesson,
            pdf_url: formatUrl(lesson.pdf_url),
            audio_url: formatUrl(lesson.audio_url),
            video_url: formatUrl(lesson.video_url),
            media_url: formatUrl(lesson.media_url)
        }));

        res.json({
            lessons: formattedData,
            total: data.length
        });
    } catch (error) {
        logger.error({ error }, 'getAllLessons error');
        res.status(500).json({ message: 'Error fetching lessons' });
    }
};

exports.getMyLessonsProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { lessons, progressList, allAssessments, assessmentResults } = await lessonService.getEnhancedLessonsProgress(userId);

        // Map everything together
        const enhancedLessons = lessons.map(lesson => {
            const up = progressList.find(p => p.lesson_id === lesson.id);
            const assessmentForLesson = allAssessments.find(a => a.lesson_id === lesson.id);
            
            const ar = assessmentForLesson
                ? assessmentResults.filter(a => a.assessment_id === assessmentForLesson.id)
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
                : null;

            const finalScore = (up && up.score !== null && up.score !== undefined) ? up.score : (ar ? ar.score : null);

            return {
                ...lesson,
                progress: up ? up.completion_percentage : 0,
                spent_time_ms: up ? up.spent_time_ms : 0,
                status: up ? up.status : 'not_started',
                score: finalScore,
                passed: ar ? ar.passed : (finalScore >= 70),
                pdf_url: formatUrl(lesson.pdf_url),
                audio_url: formatUrl(lesson.audio_url),
                video_url: formatUrl(lesson.video_url),
                media_url: formatUrl(lesson.media_url)
            };
        });

        const levelOrder = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3, 'Expert': 4 };
        enhancedLessons.sort((a, b) => {
            const orderA = levelOrder[a.level] || 99;
            const orderB = levelOrder[b.level] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return (a.display_order || 0) - (b.display_order || 0);
        });

        res.json({ lessons: enhancedLessons });
    } catch (error) {
        logger.error({ error }, 'getMyLessonsProgress error details');
        res.status(500).json({
            message: 'Error fetching user progress for lessons',
            error: error.message || 'Unknown'
        });
    }
};

exports.updateLesson = async (req, res) => {
    const { id } = req.params;
    const { title, description, level, displayOrder, content } = req.body;

    let pdfUrl = req.files?.pdf ? `/uploads/${req.files.pdf[0].filename}` : req.body.pdfUrl;
    let audioUrl = req.files?.audio ? `/uploads/${req.files.audio[0].filename}` : req.body.audioUrl;
    let videoUrl = req.files?.video ? `/uploads/${req.files.video[0].filename}` : req.body.videoUrl;

    if (pdfUrl === 'undefined' || pdfUrl === '') pdfUrl = null;
    if (audioUrl === 'undefined' || audioUrl === '') audioUrl = null;
    if (videoUrl === 'undefined' || videoUrl === '') videoUrl = null;

    let transcription = req.body.transcription;
    if (transcription === 'undefined' || transcription === '') transcription = null;

    try {
        const updatePayload = {
            id,
            title,
            description,
            level,
            display_order: parseInt(req.body.displayOrder) || 0,
            module_title: (req.body.moduleTitle && req.body.moduleTitle.toLowerCase() !== 'general') ? req.body.moduleTitle : null,
            unit_number: parseInt(req.body.unitNumber) || 1
        };

        if (content) {
            updatePayload.content = typeof content === 'string' ? JSON.parse(content) : content;
        }

        if (pdfUrl !== undefined) updatePayload.pdf_url = pdfUrl;
        if (audioUrl !== undefined) updatePayload.audio_url = audioUrl;
        if (videoUrl !== undefined) updatePayload.video_url = videoUrl;
        if (transcription !== undefined) updatePayload.transcription = transcription;

        const data = await lessonService.upsertLesson(updatePayload);

        res.json({ message: 'Lesson updated successfully', lesson: data });
    } catch (error) {
        logger.error({ error }, "Update Controller Error");
        res.status(500).json({
            message: 'Error updating lesson',
            details: error.message || 'Unknown database error'
        });
    }
};

exports.deleteLesson = async (req, res) => {
    const { id } = req.params;

    try {
        const lesson = await lessonService.getLessonById(id);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        const mediaPath = lesson.media_url;
        await lessonService.deleteLesson(id);

        if (mediaPath) {
            await mediaService.deleteFile(mediaPath);
        }

        res.json({ message: 'Lesson deleted successfully' });
    } catch (error) {
        logger.error({ error }, "Delete Error");
        res.status(500).json({ message: 'Error deleting lesson' });
    }
};

exports.updateProgress = async (req, res) => {
    const userId = req.user?.id;
    const { lessonId } = req.params;
    const { spentTimeMs, status, completionPercentage, lastActiveTab, score } = req.body;

    if (!userId) {
        return res.status(401).json({ message: 'User ID missing' });
    }

    try {
        const finalCompletion = (completionPercentage !== undefined && completionPercentage !== null)
            ? completionPercentage 
            : ((req.body.progress !== undefined && req.body.progress !== null) ? req.body.progress : 0);

        const data = await lessonService.updateProgress(userId, lessonId, {
            spent_time_ms: spentTimeMs || 0,
            status: status || 'started',
            completion_percentage: finalCompletion,
            score: (score !== undefined && score !== null) ? score : undefined,
            last_active_tab: lastActiveTab
        });

        res.json(data);
    } catch (error) {
        logger.error({ error, userId, lessonId }, 'updateProgress error');
        res.status(500).json({ 
            message: 'Progress recorded locally (sync delayed)', 
            warning: error.message,
            status: req.body.status || 'started'
        });
    }
};
