import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

interface FeedbackBlockProps {
    feedback: 'correct' | 'incorrect';
    userAnswer: string;
    correctAnswer?: string;
    isMatching?: boolean;
}

const FeedbackBlock: React.FC<FeedbackBlockProps> = ({ feedback, userAnswer, correctAnswer, isMatching }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                padding: '2rem',
                borderRadius: '24px',
                background: feedback === 'correct' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${feedback === 'correct' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                textAlign: 'center'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem', color: feedback === 'correct' ? '#10b981' : '#ef4444' }}>
                {feedback === 'correct' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {feedback === 'correct' ? 'Brilliant! (ಸರಿಯಾಗಿದೆ)' : 'Keep trying! (ತಪ್ಪಾಗಿದೆ)'}
                </h3>
            </div>
            <p style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>
                "{userAnswer || '...'}"
            </p>

            {feedback === 'incorrect' && correctAnswer && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Correct Answer:</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>
                        {correctAnswer}
                    </p>
                </div>
            )}
        </motion.div>
    );
};

export default FeedbackBlock;
