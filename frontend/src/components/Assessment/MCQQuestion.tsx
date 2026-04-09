import React from 'react';
import { motion } from 'framer-motion';

interface MCQQuestionProps {
    options: string[];
    selectedOption: string | null;
    onSelect: (opt: string) => void;
    disabled?: boolean;
}

const MCQQuestion: React.FC<MCQQuestionProps> = ({ options, selectedOption, onSelect, disabled }) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {options.map((opt) => {
                const isSelected = selectedOption === opt;
                return (
                    <motion.div
                        key={opt}
                        whileHover={{ scale: disabled ? 1 : 1.02 }}
                        whileTap={{ scale: disabled ? 1 : 0.98 }}
                        onClick={() => !disabled && onSelect(opt)}
                        style={{
                            padding: '1.5rem',
                            cursor: disabled ? 'default' : 'pointer',
                            background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: `2px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isSelected ? '0 10px 20px -5px rgba(99, 102, 241, 0.3)' : 'none'
                        }}
                    >
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isSelected ? '#6366f1' : 'transparent'
                        }}>
                            {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: isSelected ? '#fff' : '#94a3b8' }}>{opt}</span>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default MCQQuestion;
