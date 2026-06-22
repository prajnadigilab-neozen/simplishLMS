const feedbackService = require('../services/feedbackService').default;
const supabase = require('../config/supabase');

// Mock supabase client
jest.mock('../config/supabase', () => {
    return {
        from: jest.fn()
    };
});

describe('Feedback Service Unit Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('saveFeedback should successfully save feedback', async () => {
        const mockFeedback = {
            id: 'feedback-123',
            user_id: 'user-123',
            exam_id: 'exam-123',
            rating: 5,
            feedback_tags: ['Question Clarity'],
            comments: 'Great exam!'
        };

        const mockSingle = jest.fn().mockResolvedValue({ data: mockFeedback, error: null });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
        supabase.from.mockReturnValue({ insert: mockInsert });

        const result = await feedbackService.saveFeedback({
            user_id: 'user-123',
            exam_id: 'exam-123',
            rating: 5,
            feedback_tags: ['Question Clarity'],
            comments: 'Great exam!'
        });

        expect(supabase.from).toHaveBeenCalledWith('exam_feedback');
        expect(mockInsert).toHaveBeenCalledWith([{
            user_id: 'user-123',
            exam_id: 'exam-123',
            rating: 5,
            feedback_tags: ['Question Clarity'],
            comments: 'Great exam!'
        }]);
        expect(result).toEqual(mockFeedback);
    });

    test('saveFeedback should detect unique violation and throw DUPLICATE_SUBMISSION', async () => {
        const mockError = {
            code: '23505',
            message: 'duplicate key value violates unique constraint'
        };

        const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
        supabase.from.mockReturnValue({ insert: mockInsert });

        await expect(feedbackService.saveFeedback({
            user_id: 'user-123',
            exam_id: 'exam-123',
            rating: 5
        })).rejects.toThrow('Feedback already submitted for this exam');
    });

    test('getAverageRating should calculate the correct average rating', async () => {
        const mockData = [
            { rating: 5 },
            { rating: 4 },
            { rating: 3 }
        ];

        const mockEq = jest.fn().mockResolvedValue({ data: mockData, error: null });
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
        supabase.from.mockReturnValue({ select: mockSelect });

        const result = await feedbackService.getAverageRating('exam-123');

        expect(supabase.from).toHaveBeenCalledWith('exam_feedback');
        expect(mockSelect).toHaveBeenCalledWith('rating');
        expect(mockEq).toHaveBeenCalledWith('exam_id', 'exam-123');
        expect(result).toEqual({
            average_rating: 4.00,
            total_responses: 3
        });
    });

    test('getAverageRating should return 0 if no responses exist', async () => {
        const mockEq = jest.fn().mockResolvedValue({ data: [], error: null });
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
        supabase.from.mockReturnValue({ select: mockSelect });

        const result = await feedbackService.getAverageRating('exam-123');

        expect(result).toEqual({
            average_rating: 0,
            total_responses: 0
        });
    });
});
