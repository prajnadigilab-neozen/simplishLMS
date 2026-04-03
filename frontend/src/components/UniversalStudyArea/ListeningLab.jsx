import React from 'react';
import { motion } from 'framer-motion';
import { Headphones, AlertCircle, PlayCircle, BookOpen, Volume2, Sparkles, Languages } from 'lucide-react';

const ListeningLab = ({ transcription, audioUrl }) => {
    // ── Full Empty State ──
    if (!transcription && !audioUrl) {
        return (
            <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border)' }}>
                <Sparkles size={64} style={{ margin: '0 auto 1.5rem', opacity: 0.2, color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Content Coming Soon</h3>
                <p>We are currently finalizing the audio and transcription for this module.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '900px', margin: '0 auto' }}>
            
            {/* ── Audio Layer ── */}
            {audioUrl ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card" 
                    style={{ 
                        padding: '3rem 2rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)', 
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                    }}
                >
                    <div style={{ position: 'relative', marginBottom: '2rem' }}>
                        <motion.div
                            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                            style={{ 
                                width: '100px', height: '100px', borderRadius: '35%', 
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                boxShadow: '0 15px 35px rgba(99, 102, 241, 0.4)' 
                            }}
                        >
                            <Headphones size={44} color="white" />
                        </motion.div>
                        <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#10b981', width: '24px', height: '24px', borderRadius: '50%', border: '4px solid #fff' }}></div>
                    </div>

                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>ಲಿಸನ್ & ಲರ್ನ್ (Listen & Learn)</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>Focus on pronunciation and natural sentence flow.</p>
                    
                    <div style={{ width: '100%', maxWidth: '550px', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <audio controls src={audioUrl} style={{ width: '100%' }} />
                    </div>
                </motion.div>
            ) : (
                /* ── Transcription Only Mode (Premium Fallback) ── */
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card" 
                    style={{ 
                        padding: '2rem', 
                        background: 'rgba(56, 189, 248, 0.03)', 
                        borderLeft: '5px solid #38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem'
                    }}
                >
                    <div style={{ background: '#38bdf8', color: 'white', padding: '0.75rem', borderRadius: '12px' }}>
                        <Volume2 size={24} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>Transcription-First Mode</h4>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Audio is currently limited for this level. Explore the transcription to build your reading fluency.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* ── Transcription Section ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 800 }}>
                        <Languages size={22} color="var(--primary)" /> Transcription (ಪ್ರತಿಲಿಪಿ)
                    </h3>
                    <div style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Sparkles size={14} /> AI OPTIMIZED
                    </div>
                </div>

                <div 
                    className="glass-card" 
                    style={{ 
                        padding: '2.5rem', 
                        background: 'var(--bg-main)', 
                        border: '1px solid var(--border)',
                        borderRadius: '24px',
                        position: 'relative',
                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)'
                    }}
                >
                    {/* Background Decorative Element */}
                    <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', opacity: 0.03 }}>
                        <BookOpen size={120} />
                    </div>

                    <p style={{ 
                        fontSize: '1.2rem', 
                        color: 'var(--text-main)', 
                        lineHeight: '1.8', 
                        whiteSpace: 'pre-wrap',
                        position: 'relative',
                        fontWeight: 500,
                        letterSpacing: '0.01em'
                    }}>
                        {transcription || "No transcription text provided for this lesson."}
                    </p>
                </div>
            </motion.div>

            {/* ── Learning Footer Tip ── */}
            <div style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.5 }}>
                <p style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={14} /> Pro-Tip: Try reading the transcription aloud to practice your clarity!
                </p>
            </div>

        </div>
    );
};

export default ListeningLab;
