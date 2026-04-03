import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Trophy, Globe, FileText,
    Zap, Play, Quote, Info,
    AlertCircle, Music, Sparkles
} from 'lucide-react';
import { lessonApi } from '../utils/api';
import { useToast } from './Toast';

const CoachingPage = ({ lesson, onComplete, onBack }) => {
    const [currentMediaIdx, setCurrentMediaIdx] = useState(0);
    const [showInfo, setShowInfo] = useState(false);
    const sessionStartTimeRef = useRef(Date.now());
    const showToast = useToast();

    // Motivational Quotes Array
    const quotes = [
        "ನಿಮ್ಮ ಪ್ರಯತ್ನವೇ ನಿಮ್ಮ ಯಶಸ್ಸು! (Your effort is your success!)",
        "ಪ್ರತಿದಿನ ಕಲಿಯಿರಿ, ಪ್ರತಿದಿನ ಬೆಳೆಯಿರಿ. (Learn every day, grow every day.)",
        "ಇಂಗ್ಲಿಷ್ ಒಂದು ಕಲೆ, ನೀವು ಅದರ ಕಲಾವಿದರು. (English is an art, and you are the artist.)",
        "ಸಣ್ಣ ಹೆಜ್ಜೆಗಳೇ ದೊಡ್ಡ ಗುರಿಯನ್ನು ತಲುಪಿಸುತ್ತವೆ. (Small steps lead to big goals.)",
        "ಕಲಿಕೆಯಲ್ಲಿ ಸೋಲಿಲ್ಲ, ಕೇವಲ ಅನುಭವವಷ್ಟೇ. (There is no failure in learning, only experience.)"
    ];

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // Calculate available sequential media
    const availableMedia = [];
    if (lesson?.pdf_url) availableMedia.push({ type: 'pdf', url: lesson.pdf_url, title: 'Study Resource (PDF)' });
    if (lesson?.audio_url) availableMedia.push({ type: 'audio', url: lesson.audio_url, title: 'Listening Drill (Audio)' });
    if (lesson?.video_url) availableMedia.push({ type: 'video', url: lesson.video_url, title: 'Video Lecture' });
    if (lesson?.transcription) availableMedia.push({ type: 'transcription', content: lesson.transcription, title: 'Lesson Transcription' });

    if (availableMedia.length === 0 && lesson?.media_url) {
        availableMedia.push({ type: lesson.media_type || 'unknown', url: lesson.media_url, title: 'Lesson Content' });
    }

    const activeMedia = availableMedia[currentMediaIdx] || { type: 'none', url: '' };
    const hasNextMedia = currentMediaIdx < availableMedia.length - 1;

    const [maxMediaIdx, setMaxMediaIdx] = useState(0); // Track the furthest reached phase
    const initialSpentTime = lesson?.spent_time_ms || 0;

    // 1. UPDATE PROGRESS ON PHASE CHANGE (Automated Progress FR-06)
    useEffect(() => {
        if (currentMediaIdx > maxMediaIdx) {
            setMaxMediaIdx(currentMediaIdx);
        }
        
        saveProgress('started', currentMediaIdx);
    }, [currentMediaIdx]);

    // 2. PERIODIC SAVE (HEARTBEAT) (Automated Progress FR-06)
    useEffect(() => {
        const interval = setInterval(() => {
            saveProgress('started');
        }, 30000); // Pulse every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // 3. CLEANUP SAVE ON UNMOUNT (Automated Progress FR-06)
    useEffect(() => {
        return () => {
            saveProgress('started');
        };
    }, []);

    const saveProgress = async (status = 'started', idx = currentMediaIdx) => {
        const sessionTime = Date.now() - sessionStartTimeRef.current;
        const totalTime = initialSpentTime + sessionTime;
        const completion = Math.max(
            lesson?.progress || 0,
            Math.round(((idx + 1) / availableMedia.length) * 100)
        );

        try {
            await lessonApi.updateProgress(lesson.id, {
                spentTimeMs: totalTime,
                status: status,
                completionPercentage: completion,
                lastActiveTab: availableMedia[idx]?.type || 'general'
            });
            console.log(`[Progress] Saved: ${totalTime}ms, ${completion}%, Tab: ${availableMedia[idx]?.type}`);
        } catch (err) {
            console.error('Failed to auto-update progress:', err);
        }
    };

    if (!lesson) return null;

    const getMediaSrc = (url) => url;

    return (
        <div className="coaching-zen-mode" style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', // Deep Indigo to Navy
            color: '#ffffff',
            marginTop: '-2rem',
            marginLeft: '-2rem',
            marginRight: '-2rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decor */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(45, 212, 191, 0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(60px)', zIndex: 0 }} />

            {/* 1. TOP NAVBAR */}
            <header style={{
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                zIndex: 10,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                            padding: '0.6rem', borderRadius: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{lesson.title}</h2>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>{lesson.level} English</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'none', md: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                        <Trophy size={16} /> <span>DAILY GOAL</span>
                    </div>
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                        <Info size={22} />
                    </button>
                </div>
            </header>

            {/* 2. MAIN CONTENT AREA */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                padding: '1rem',
                position: 'relative',
                zIndex: 5,
                maxWidth: '1200px',
                margin: '0 auto',
                width: '100%',
                maxHeight: 'calc(100vh - 70px)',
                overflowY: 'auto'
            }}>

                {/* Motivational Banner */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <div style={{ color: '#fbbf24', display: 'flex' }}><Sparkles size={18} /></div>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.4 }}>
                        {randomQuote}
                    </p>
                </motion.div>

                {/* Phase Title - New */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '-0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Phase {currentMediaIdx + 1}: {activeMedia.title}
                    </h3>
                </div>

                {/* Media Container */}
                <div style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                    minHeight: '300px'
                }}>
                    {activeMedia.type === 'pdf' ? (
                        <div style={{ flex: 1, width: '100%', position: 'relative' }}>
                            <object
                                data={`${getMediaSrc(activeMedia.url)}#toolbar=0&view=FitH`}
                                type="application/pdf"
                                style={{ width: '100%', height: '100%', minHeight: '400px' }}
                            >
                                <div style={{ padding: '2rem', textAlign: 'center' }}>
                                    <FileText size={48} color="#818cf8" />
                                    <p style={{ marginTop: '1rem', color: '#94a3b8' }}>PDF Preview not available.</p>
                                    <a href={getMediaSrc(activeMedia.url)} target="_blank" rel="noopener noreferrer" className="zen-btn" style={{ background: '#6366f1', color: '#fff', display: 'inline-flex' }}>Open PDF</a>
                                </div>
                            </object>
                        </div>
                    ) : activeMedia.type === 'video' ? (
                        <video controls style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}>
                            <source src={getMediaSrc(activeMedia.url)} type="video/mp4" />
                        </video>
                    ) : activeMedia.type === 'audio' ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#020617', padding: '2rem' }}>
                            <motion.div
                                animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                style={{ padding: '2rem', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', marginBottom: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                            >
                                <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' }}>
                                    <Music size={40} color="white" />
                                </div>
                            </motion.div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem', textAlign: 'center' }}>ಲಿಸನ್ & ಲರ್ನ್ (Listen & Learn)</h3>
                            <p style={{ color: '#94a3b8', marginBottom: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>Immerse yourself in the English sound.</p>
                            <div style={{ width: '100%', maxWidth: '400px' }}>
                                <audio controls style={{ width: '100%' }} src={getMediaSrc(activeMedia.url)} />
                            </div>
                        </div>
                    ) : activeMedia.type === 'transcription' ? (
                        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.3)' }}>
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                <div style={{ 
                                    fontSize: '1.15rem', 
                                    lineHeight: '1.8', 
                                    color: '#f1f5f9', 
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: '"Outfit", sans-serif',
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '16px'
                                }}>
                                    {activeMedia.content}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>
                            <AlertCircle size={48} style={{ marginBottom: '1rem', color: '#f43f5e' }} />
                            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Media unavailable or still loading...</p>
                            <p style={{ maxWidth: '300px', fontSize: '0.9rem', opacity: 0.7 }}>If this persists, try checking other training phases or your connection.</p>
                        </div>
                    )}

                    {/* Quick Info Overlay */}
                    <AnimatePresence>
                        {showInfo && (
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25 }}
                                style={{
                                    position: 'absolute', top: 0, right: 0, bottom: 0, width: '320px',
                                    background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)',
                                    padding: '2rem', zIndex: 100, borderLeft: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: 0 }}>Lesson Details</h4>
                                    <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                    {lesson.description || "Start your English journey with this essential lesson."}
                                </div>
                                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <Zap size={18} color="#fbbf24" /> <span>Gain up to 50 XP</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <Play size={18} color="#10b981" /> <span>{availableMedia.length} Training Phases</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600 }}>Training Progress</span>
                            <span style={{ color: '#10b981' }}>{Math.round(((currentMediaIdx + 1) / availableMedia.length) * 100)}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentMediaIdx + 1) / availableMedia.length) * 100}%` }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #2dd4bf)', borderRadius: '4px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {currentMediaIdx > 0 && (
                            <button className="zen-btn" onClick={() => setCurrentMediaIdx(p => p - 1)} style={{ background: 'rgba(255,255,255,0.05)' }}>
                                Previous
                            </button>
                        )}

                        {hasNextMedia ? (
                            <button className="zen-btn" style={{ background: '#6366f1', color: '#fff' }} onClick={() => setCurrentMediaIdx(p => p + 1)}>
                                Continue →
                            </button>
                        ) : (
                            <button
                                className="zen-btn"
                                style={{ background: 'linear-gradient(90deg, #10b981, #3b82f6)', color: '#fff', padding: '0.75rem 2.5rem' }}
                                onClick={async () => {
                                    await saveProgress('completed', availableMedia.length - 1);
                                    onComplete();
                                }}
                            >
                                Finished! 🚀
                            </button>
                        )}
                    </div>
                </div>
            </main>

            <style>{`
                .zen-btn {
                    padding: 0.7rem 1.75rem;
                    border: none;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap;
                    letter-spacing: 0.02em;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    text-decoration: none;
                }
                .zen-btn:hover { 
                    transform: translateY(-3px); 
                    filter: brightness(1.15);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
                }
                .zen-btn:active { 
                    transform: translateY(-1px); 
                }
            `}</style>
        </div>
    );
};

export default CoachingPage;

