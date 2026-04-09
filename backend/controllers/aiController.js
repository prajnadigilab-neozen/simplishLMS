const aiService = require('../services/aiService');

/**
 * AI Chat Controller — powered by Google Gemini
 */
exports.chat = async (req, res) => {
    const { message, lessonContext } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message is required' });
    }

    try {
        const reply = await aiService.generateChatResponse(message, lessonContext);
        res.json({ reply });
    } catch (error) {
        console.error('AI Chat Error:', error.message);
        res.status(500).json({ message: 'AI service error. Please try again.' });
    }
};

/**
 * AI Lesson Generation Controller
 */
exports.generateLessonContent = async (req, res) => {
    const { prompt, engine } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
    }

    try {
        const content = await aiService.generateLesson(prompt, engine);
        res.json({ content });
    } catch (error) {
        console.error('AI Generation Error:', error.message);
        res.status(500).json({ message: 'Error generating lesson content.' });
    }
};