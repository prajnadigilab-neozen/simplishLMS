import React from 'react';
import { motion } from 'framer-motion';

interface AssessmentHeaderProps {
    currentQuestion: number;
    totalQuestions: number;
    onExit: () => void;
}

const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({ currentQuestion, totalQuestions, onExit }) => {
    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Question {currentQuestion + 1} of {totalQuestions}
                </span>
                <div style={{ width: '240px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '10px' }}
                    />
                </div>
            </div>
            <button
                onClick={onExit}
                style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#94a3b8', 
                    padding: '0.6rem 1.2rem', 
                    borderRadius: '12px', 
                    fontSize: '0.85rem', 
                    fontWeight: 600, 
                    cursor: 'pointer' 
                }}
            >
                Exit
            </button>
        </header>
    );
};

export default AssessmentHeader;
