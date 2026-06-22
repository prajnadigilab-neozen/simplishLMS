import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import xss from 'xss';
import feedbackService from '../services/feedbackService';
import logger from '../utils/logger';

// Import authMiddleware (CommonJS format)
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Define feedback-specific rate limiting: max 5 submissions per hour per IP to prevent spamming
const feedbackLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // Limit each IP to 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many feedback attempts. Please try again in an hour.' },
    skip: () => process.env.NODE_ENV !== 'production' // Skip in development
});

// Zod Schema for validation
const feedbackSchema = z.object({
    rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    feedback_tags: z.array(z.string()).optional().default([]),
    comments: z.string().max(500, "Comments cannot exceed 500 characters").optional()
});

// Type definition for Request with authenticated user
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
        email?: string;
        phone?: string;
        fullName?: string;
    };
}

/**
 * @route POST /api/v1/exams/:id/feedback
 * @desc Submit feedback after completing a graduation exam
 * @access Private (Authenticated students)
 */
router.post(
    '/:id/feedback',
    authMiddleware,
    feedbackLimiter,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        const examId = req.params.id as string;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: 'User session not found' });
            return;
        }

        // 1. Validate Input Payload using Zod
        const parseResult = feedbackSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                message: 'Invalid feedback data provided',
                errors: parseResult.error.flatten().fieldErrors
            });
            return;
        }

        const { rating, feedback_tags, comments } = parseResult.data;

        // 2. Sanitize Text Input to Prevent XSS (Double Protection alongside global sanitizer)
        const sanitizedComments = comments ? xss(comments.trim()) : '';

        try {
            logger.info({ userId, examId, rating }, 'Submitting exam feedback');

            // 3. Save Feedback via database service
            const savedFeedback = await feedbackService.saveFeedback({
                user_id: userId,
                exam_id: examId,
                rating,
                feedback_tags,
                comments: sanitizedComments
            });

            res.status(201).json({
                message: 'Feedback submitted successfully',
                feedback: savedFeedback
            });
        } catch (error: any) {
            if (error.code === 'DUPLICATE_SUBMISSION') {
                logger.warn({ userId, examId }, 'Duplicate exam feedback submission blocked');
                // Graceful response for idempotency
                res.status(409).json({
                    message: 'Feedback has already been submitted for this exam'
                });
                return;
            }

            logger.error({ error, userId, examId }, 'Error saving exam feedback');
            res.status(500).json({
                message: 'Internal server error while saving feedback'
            });
        }
    }
);

/**
 * @route GET /api/v1/exams/feedback
 * @desc Get all exam feedback submissions (Admin/moderator only)
 * @access Private
 */
router.get(
    '/feedback',
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        const userRole = req.user?.role;
        if (!userRole || !['admin', 'super_admin', 'moderator'].includes(userRole)) {
            res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
            return;
        }

        try {
            const feedbacks = await feedbackService.getAllFeedback();
            res.json({ feedbacks });
        } catch (error) {
            logger.error({ error }, 'Error fetching all exam feedback');
            res.status(500).json({
                message: 'Internal server error while fetching feedback'
            });
        }
    }
);

export default router;
