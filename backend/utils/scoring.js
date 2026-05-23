// LOGIC: Assessment Scoring
// 1. MCQ: Exact match between user choice and 'correct_answer'.
// 2. Text: Case-insensitive match or fuzzy matching (can be improved with AI).
// 3. Voice/OCR: In Step 4, these will yield 'transcribedText' or 'extractedText', 
//    which we then compare against the correct answer.

exports.calculateScore = (questions, answers) => {
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach(q => {
        totalPoints += q.points;
        const userAnswer = answers[q.id];

        if (!userAnswer) return;

        const clean = (text) => (text || "").toString().trim().toLowerCase().replace(/[^a-z0-9\u0C80-\u0CFF\s]/gi, "");

        const userClean = clean(userAnswer);

        // Normalize options and question type
        const opts = q.options ? (Array.isArray(q.options) ? q.options : [q.options]) : [];
        let qType = q.question_type || q.type;
        if (opts.length > 0) {
            qType = 'MCQ';
        } else if (qType !== 'Matching' && qType !== 'Voice' && qType !== 'Image') {
            qType = 'Text';
        }

        // Support alternative answers split by "/" or " or "
        const correctAnswers = (q.correct_answer || "").toString().split(/\s*[\/]\s*|\s+or\s+/i);
        
        let isCorrect = correctAnswers.some(ans => {
            const correctClean = clean(ans);
            return userClean === correctClean && userClean !== "";
        });

        // Robust fallback for MCQ / letter prefixes
        if (!isCorrect && qType === 'MCQ') {
            isCorrect = correctAnswers.some(correctAns => {
                const matchLetterUser = String(userAnswer).trim().match(/^([A-D])\)/i);
                const matchLetterCorrect = String(correctAns).trim().match(/^([A-D])(?:$|\))/i);
                if (matchLetterUser && matchLetterCorrect) {
                    return matchLetterUser[1].toLowerCase() === matchLetterCorrect[1].toLowerCase();
                } else if (matchLetterUser) {
                    return matchLetterUser[1].toLowerCase() === String(correctAns).trim().toLowerCase();
                } else if (matchLetterCorrect) {
                    return String(userAnswer).trim().toLowerCase() === String(correctAns).replace(/^([A-D])\)\s*/i, "").trim().toLowerCase();
                } else {
                    const cleanUserNoPrefix = String(userAnswer).replace(/^([A-D])\)\s*/i, "").trim().toLowerCase();
                    const cleanCorrectNoPrefix = String(correctAns).replace(/^([A-D])\)\s*/i, "").trim().toLowerCase();
                    return clean(cleanUserNoPrefix) === clean(cleanCorrectNoPrefix);
                }
            });
        }

        if (isCorrect) {
            earnedPoints += q.points;
        }
    });

    const score = Math.round((earnedPoints / totalPoints) * 100);
    return {
        score,
        passed: score >= 80, // Configurable passing criteria
        earnedPoints,
        totalPoints
    };
};

