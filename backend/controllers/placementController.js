const placementService = require('../services/placementService');
const userService = require('../services/userService').default;

/**
 * Fetch adaptive placement questions.
 */
exports.getQuestions = async (req, res) => {
    try {
        const questions = await placementService.getAdaptiveQuestions();
        res.json(questions);
    } catch (error) {
        console.error('getQuestions error:', error);
        res.status(500).json({ message: 'Error fetching placement questions' });
    }
};

/**
 * Submit placement test results.
 */
exports.submitTest = async (req, res) => {
    const userId = req.user?.id;
    const { answers } = req.body;

    if (!userId || !answers) {
        return res.status(400).json({ message: 'Missing user context or answers' });
    }

    try {
        const questionIds = Object.keys(answers);
        const questions = await placementService.getQuestionsByIds(questionIds);

        let totalCorrect = 0;
        let totalQuestions = questions.length;
        let scorePerLevel = {
            'Basic': { correct: 0, total: 0 },
            'Intermediate': { correct: 0, total: 0 },
            'Advanced': { correct: 0, total: 0 },
            'Expert': { correct: 0, total: 0 }
        };

        questions.forEach(q => {
            const level = q.difficulty_level;
            scorePerLevel[level].total++;
            if (answers[q.id] === q.correct_answer) {
                scorePerLevel[level].correct++;
                totalCorrect++;
            }
        });

        const scorePercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

        let assignedLevel = 'Basic';
        const levels = ['Expert', 'Advanced', 'Intermediate', 'Basic'];
        for (const lvl of levels) {
            if (scorePerLevel[lvl].total > 0 && (scorePerLevel[lvl].correct / scorePerLevel[lvl].total) >= 0.5) {
                assignedLevel = lvl;
                break;
            }
        }

        // Update user via Service Layer
        await userService.updateUser(userId, {
            current_level: assignedLevel,
            onboarding_completed: true
        });

        // Record Placement Result via Service Layer
        try {
            await placementService.saveResult(userId, {
                score_percentage: parseFloat(scorePercentage.toFixed(2)),
                assigned_level: assignedLevel
            });
        } catch (_) { /* non-critical */ }

        // Record XP via Service Layer
        try {
            await userService.addXP(userId, 50, 'placement_test');
        } catch (_) { /* non-critical */ }

        res.json({
            message: 'Placement test completed successfully',
            assignedLevel,
            scorePercentage: parseFloat(scorePercentage.toFixed(2)),
            scorePerLevel
        });
    } catch (error) {
        console.error('submitTest error:', error);
        res.status(500).json({ message: 'Error processing placement test' });
    }
};

/**
 * Get Placement Leaderboard.
 */
exports.getLeaderboard = async (req, res) => {
    try {
        const data = await placementService.getLeaderboard();

        const leaderboard = (data || []).map(item => ({
            id: item.id,
            userName: item.users?.full_name || 'Anonymous Learner',
            avatarUrl: item.users?.avatar_url || null,
            score: item.score_percentage,
            level: item.assigned_level,
            date: item.completed_at
        }));

        res.json(leaderboard);
    } catch (error) {
        console.error('getLeaderboard error:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
};
