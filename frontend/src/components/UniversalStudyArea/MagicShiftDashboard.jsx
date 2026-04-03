import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowDown } from 'lucide-react';

const MagicShiftDashboard = ({ logicContent }) => {
    if (!logicContent || !Array.isArray(logicContent) || logicContent.length === 0) {
        return (
            <section className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3>No Logic Content Available</h3>
                <p>This lesson does not contain study logic or structure breakdowns.</p>
            </section>
        );
    }

    return (
        <section className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✨ Magic Shift (ಮ್ಯಾಜಿಕ್ ಶಿಫ್ಟ್)
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                See how Kannada (SOV) transforms into English (SVO).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {logicContent.map((logic, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {logic.explanation && (
                            <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderLeft: '3px solid #6366f1', color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.5' }}>
                                {logic.explanation}
                            </div>
                        )}

                        {Array.isArray(logic.kannadaStructure) && logic.kannadaStructure.length > 0 && (
                            <div style={{ padding: '1.5rem', background: 'var(--bg-dark)', borderRadius: '0.75rem', border: '1px dashed var(--border)' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                                    Kannada Format: SOV
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                                    {logic.kannadaStructure.map((item, i) => (
                                        <div key={i} style={{
                                            background: item.label === 'Subject' ? '#bfdbfe' : item.label === 'Verb' ? '#bbf7d0' : '#fed7aa',
                                            color: item.label === 'Subject' ? '#1d4ed8' : item.label === 'Verb' ? '#15803d' : '#c2410c',
                                            padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center'
                                        }}>
                                            {item.word} <br /><span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {Array.isArray(logic.kannadaStructure) && Array.isArray(logic.englishStructure) && (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <motion.div
                                    animate={{ y: [0, 5, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    style={{ color: 'var(--primary)' }}
                                >
                                    <ArrowDown size={32} />
                                </motion.div>
                            </div>
                        )}

                        {Array.isArray(logic.englishStructure) && logic.englishStructure.length > 0 && (
                            <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.75rem', border: '2px solid var(--primary-light)' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                                    English Format: SVO
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                                    {logic.englishStructure.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}
                                            style={{
                                                background: item.label === 'Subject' ? '#bfdbfe' : item.label === 'Verb' ? '#bbf7d0' : '#fed7aa',
                                                color: item.label === 'Subject' ? '#1d4ed8' : item.label === 'Verb' ? '#15803d' : '#c2410c',
                                                padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center',
                                                boxShadow: item.label === 'Verb' ? '0 4px 15px rgba(21, 128, 61, 0.2)' : 'none'
                                            }}>
                                            {item.word} <br /><span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{item.label}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default MagicShiftDashboard;
