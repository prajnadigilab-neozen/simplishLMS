const scoring = require('../utils/scoring');

describe('Assessment Scoring Logic', () => {
    const mockQuestions = [
        { id: 'q1', question_type: 'MCQ', correct_answer: 'Namaskara', points: 10 },
        { id: 'q2', question_type: 'Text', correct_answer: 'Reading', points: 10 }
    ];

    test('should calculate 100% score for all correct answers', () => {
        const answers = { q1: 'Namaskara', q2: 'Reading' };
        const result = scoring.calculateScore(mockQuestions, answers);

        expect(result.score).toBe(100);
        expect(result.passed).toBe(true);
        expect(result.earnedPoints).toBe(20);
    });

    test('should calculate 50% score for one correct answer', () => {
        const answers = { q1: 'Namaskara', q2: 'Wrong' };
        const result = scoring.calculateScore(mockQuestions, answers);

        expect(result.score).toBe(50);
        expect(result.passed).toBe(false);
    });

    test('should be case-insensitive for Text questions', () => {
        const answers = { q1: 'Namaskara', q2: 'reading' }; // 'reading' instead of 'Reading'
        const result = scoring.calculateScore(mockQuestions, answers);

        expect(result.score).toBe(100);
    });

    test('should handle missing answers correctly', () => {
        const answers = { q1: 'Namaskara' }; // q2 is missing
        const result = scoring.calculateScore(mockQuestions, answers);

        expect(result.score).toBe(50);
    });

    test('should support robust MCQ prefix matching', () => {
        const mcqQuestions = [
            { id: 'q1', question_type: 'MCQ', correct_answer: 'B', points: 10 },
            { id: 'q2', question_type: 'MCQ', correct_answer: 'A) Apple', points: 10 }
        ];

        // Case 1: user selected "B) An apple" for correct_answer "B"
        // Case 2: user selected "Apple" for correct_answer "A) Apple"
        const answers = { q1: 'B) An apple', q2: 'Apple' };
        const result = scoring.calculateScore(mcqQuestions, answers);

        expect(result.score).toBe(100);
        expect(result.passed).toBe(true);
    });
});
