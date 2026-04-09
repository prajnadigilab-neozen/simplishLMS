import React from 'react';
import { MatchingPair } from '../../types';

interface MatchingQuestionProps {
    pairs: MatchingPair[];
    shuffledOptions: string[];
    activeMatchLeft: string | null;
    matchingAnswers: Record<string, string>;
    onSelectLeft: (item: string) => void;
    onSelectRight: (item: string) => void;
    disabled?: boolean;
}

const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
    pairs,
    shuffledOptions,
    activeMatchLeft,
    matchingAnswers,
    onSelectLeft,
    onSelectRight,
    disabled
}) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pairs.map((p, idx) => {
                    const isSelected = activeMatchLeft === p.english;
                    const isMatched = matchingAnswers[p.english];
                    return (
                        <div 
                            key={`left-${idx}`}
                            onClick={() => !disabled && onSelectLeft(p.english)}
                            style={{
                                padding: '1rem', borderRadius: '1rem',
                                border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : (isMatched ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)'),
                                cursor: disabled ? 'default' : 'pointer',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                        >
                            <span style={{ fontWeight: 600 }}>{p.english}</span>
                            {isMatched && <span style={{ fontSize: '0.7rem', color: '#10b981' }}>Linked</span>}
                        </div>
                    );
                })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {shuffledOptions.map((kan, idx) => {
                    const isMatchedWith = Object.keys(matchingAnswers).find(key => matchingAnswers[key] === kan);
                    return (
                        <div 
                            key={`right-${idx}`}
                            onClick={() => !disabled && onSelectRight(kan)}
                            style={{
                                padding: '1rem', borderRadius: '1rem',
                                border: isMatchedWith ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                background: isMatchedWith ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                cursor: activeMatchLeft && !disabled ? 'pointer' : 'default',
                                color: isMatchedWith ? '#fff' : '#94a3b8'
                            }}
                        >
                            {kan}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MatchingQuestion;
