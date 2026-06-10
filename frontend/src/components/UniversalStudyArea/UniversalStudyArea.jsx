import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Glasses, Target, Loader2, Headphones, Sparkles, ChevronLeft, Video, Download, FileText } from 'lucide-react';
import api from '../../utils/api';
import simplishTalksLogo from '../../assets/logo_final.png';
import MagicShiftDashboard from './MagicShiftDashboard';
import SentenceEvolution from './SentenceEvolution';
import ReadingLab from './ReadingLab';
import ListeningLab from './ListeningLab';
import VocabularyLab from './VocabularyLab';
import MilestoneTest from './MilestoneTest';
import ExamInterface from './ExamInterface';
import { useToast } from '../Toast';
import { useUser } from '../../context/UserContext';
import { useCurriculum } from '../../hooks/useCurriculum';
import { safeSetItem } from '../../utils/storageUtils';

const UniversalStudyArea = ({ lesson, onBack }) => {
    const { user, language } = useUser();
    const { courseCompleted, handleNextLesson: onNextLesson, isReviewMode } = useCurriculum();
    const isExam = !!lesson?.content?.isExam || !!lesson?.content?.isFinal || lesson?.title?.toLowerCase().includes("graduation test") || lesson?.title?.toLowerCase().includes("graduation exam");
    const [activeTab, setActiveTab] = useState(() => {
        return isExam ? 'test' : 'study';
    });
    const [loading, setLoading] = useState(true);
    const tabsContainerRef = React.useRef(null);
    const sessionStartTimeRef = React.useRef(Date.now());
    const initialSpentTime = lesson?.spent_time_ms || 0;
    const showToast = useToast();

    // Auto-scroll logic for active tab
    useEffect(() => {
        if (tabsContainerRef.current) {
            const activeBtn = tabsContainerRef.current.querySelector('[data-active="true"]');
            if (activeBtn) {
                activeBtn.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest', 
                    inline: 'center' 
                });
            }
        }
    }, [activeTab]);

    useEffect(() => {
        // Validation: If no lesson or invalid lesson ID, redirect back
        if (!courseCompleted && (!lesson || !lesson.id)) {
            showToast(language === 'kn' ? "ತಪ್ಪಾದ ಪಾಠ ಮಾಹಿತಿ. ಲೈಬ್ರರಿಗೆ ಹಿಂತಿರುಗಿಸಲಾಗುತ್ತಿದೆ..." : "Invalid lesson data. Redirecting to Library...", 'error');
            onBack();
            return;
        }

        // Reset to study tab for new lesson unless course is completed
        if (!courseCompleted) {
            if (lesson?.title?.includes("Basic (Level 1) – Graduation Test")) {
                setActiveTab('test');
            } else {
                setActiveTab('study');
            }
        }
        setLoading(false);
    }, [lesson, courseCompleted]);

    // 1. HEARTBEAT PULSE (Automated Progress FR-06)
    useEffect(() => {
        const interval = setInterval(() => {
            saveProgress(activeTab);
        }, 30000); // Pulse every 30 seconds
        return () => clearInterval(interval);
    }, [activeTab, lesson?.id]);

    // 2. UNMOUNT SYNC (Automated Progress FR-06)
    useEffect(() => {
        return () => {
            saveProgress(activeTab);
        };
    }, [activeTab, lesson?.id]);

    const saveProgress = async (tab) => {
        if (!lesson?.id) return;
        const sessionTime = Date.now() - sessionStartTimeRef.current;
        const totalTime = initialSpentTime + sessionTime;

        try {
            await api.post(`/lessons/${lesson.id}/progress`, {
                lastActiveTab: tab,
                spentTimeMs: totalTime,
                status: (lesson.progress || 0) >= 100 ? 'completed' : 'started'
            });
            console.log(`[Progress] Auto-saved for ${lesson.title}: ${totalTime}ms`);
        } catch (err) {
            console.error("Failed to auto-save progress", err);
        }
    };

    const handleTabChange = async (tab) => {
        setActiveTab(tab);
        safeSetItem('simplish_last_tab', tab);
        await saveProgress(tab);
    };

    if (loading) {
        return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" size={48} /></div>;
    }

    if (courseCompleted) {
        return (
            <div className="universal-study-area" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-card"
                    style={{ padding: '4rem', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '2px solid var(--primary)' }}
                >
                    <img src={simplishTalksLogo} alt="Congratulations" style={{ width: '80px', height: '80px', margin: '0 auto 2rem auto', objectFit: 'contain' }} />
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                        {language === 'kn' ? `ಅಭಿನಂದನೆಗಳು, ${user?.fullName || ''}!` : `Congratulations, ${user?.fullName || ''}!`}
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
                        {language === 'kn' 
                            ? "ನೀವು ಲಭ್ಯವಿರುವ ಎಲ್ಲಾ ಪಾಠಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಳಿಸಿದ್ದೀರಿ. ಇಂಗ್ಲಿಷ್ ಕಲಿಯುವಲ್ಲಿ ನಿಮ್ಮ ಹಾದಿ ಉತ್ತಮವಾಗಿದೆ! 🚀" 
                            : "You've successfully completed all available lessons. You're well on your way to mastering English! 🚀"}
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={onBack} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                            {language === 'kn' ? 'ಲೈಬ್ರರಿಗೆ ಹೋಗಿ' : 'Go to Library'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="universal-study-area">
            {/* Header and other UI elements... */}
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-main)',
                            padding: '0.6rem', borderRadius: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <BookOpen color="var(--primary)" /> {lesson?.title || (language === 'kn' ? 'ವ್ಯಾಸಂಗ ಪ್ರದೇಶ' : 'Universal Study Area')}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '0.25rem' }}>
                            {language === 'kn' 
                                ? 'ಯಾವುದೇ ಸಾಧನದಲ್ಲಿ ಇಂಗ್ಲಿಷ್ ವಾಕ್ಯ ರಚನೆಗಳನ್ನು ಸುಲಭವಾಗಿ ಕಲಿಯಿರಿ.' 
                                : 'Master English sentence structures seamlessly across any device.'}
                        </p>
                    </div>
                </div>

                {lesson?.pdf_url && (
                    <a 
                        href={lesson.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn"
                        style={{ 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            color: '#3b82f6', 
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 700
                        }}
                    >
                        <Download size={18} /> {language === 'kn' ? 'PDF ಡೌನ್‌ಲೋಡ್' : 'Download PDF'}
                    </a>
                )}
            </header>

            {/* Custom Tab Navigation - Reliable & Snappy */}
            {!isExam && (
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    padding: '0.75rem 0',
                    marginTop: '-1rem'
                }}>
                    <div 
                        ref={tabsContainerRef}
                        className="hide-scrollbar" 
                        style={{ 
                            display: 'flex', 
                            gap: '0.6rem', 
                            overflowX: 'auto', 
                            padding: '0.25rem 0.5rem',
                            WebkitOverflowScrolling: 'touch',
                            touchAction: 'pan-x',
                            scrollBehavior: 'smooth',
                            scrollSnapType: 'x mandatory'
                        }}
                    >
                        {[
                            { id: 'video', label: language === 'kn' ? 'ವಿಡಿಯೋ' : 'Video', icon: Video, show: !!lesson?.video_url },
                            { id: 'study', label: language === 'kn' ? 'ಅಧ್ಯಯನ' : 'Study', icon: BookOpen, show: true },
                            { id: 'reading', label: language === 'kn' ? 'ಓದುವಿಕೆ' : 'Reading', icon: Glasses, show: true },
                            { id: 'listening', label: language === 'kn' ? 'ಶ್ರವಣ' : 'Listening', icon: Headphones, show: true },
                            { id: 'vocabulary', label: language === 'kn' ? 'ಶಬ್ದಕೋಶ' : 'Vocabulary', isLogo: true, show: true },
                            { id: 'test', label: language === 'kn' ? 'ಮೌಲ್ಯಮಾಪನ' : 'Test', icon: Target, show: true },
                        ].filter(t => t.show).map(tab => {
                            const isDisabled = isExam && tab.id !== 'test';
                            const isActive = activeTab === tab.id;
                            
                            return (
                                <button
                                    key={tab.id}
                                    disabled={isDisabled}
                                    data-active={isActive}
                                    onClick={() => !isDisabled && handleTabChange(tab.id)}
                                    style={{
                                        background: isActive ? 'var(--primary)' : 'rgba(var(--text-main-rgb), 0.05)',
                                        border: '1px solid ' + (isActive ? 'var(--primary)' : 'var(--border)'),
                                        padding: '0.6rem 1.15rem',
                                        borderRadius: '16px',
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        opacity: isDisabled ? 0.4 : 1,
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        color: isActive ? '#ffffff' : 'var(--text-muted)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        minHeight: '44px',
                                        scrollSnapAlign: 'center',
                                        boxShadow: isActive ? '0 4px 15px rgba(var(--primary-rgb), 0.3)' : 'none'
                                    }}
                                >
                                    {tab.isLogo ? (
                                        <img src={simplishTalksLogo} alt="Icon" style={{ width: '16px', height: '16px', borderRadius: '4px', filter: isActive ? 'brightness(0) invert(1)' : 'grayscale(100%) opacity(0.6)' }} />
                                    ) : (
                                        <tab.icon size={16} />
                                    )}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Check for Exam Mode */}
            {isExam ? (
                <div style={{ padding: '1rem 0' }}>
                    <ExamInterface
                        examData={lesson.content}
                        lessonId={lesson.id}
                        isReview={isReviewMode}
                        dbScore={lesson.score}
                        onComplete={(target) => {
                            if (target === 'library') {
                                onBack();
                            } else {
                                showToast("ಪರೀಕ್ಷೆ ಪೂರ್ಣಗೊಂಡಿದೆ! (Exam Complete!)", 'success');
                                if (onNextLesson) onNextLesson();
                            }
                        }}
                    />
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'video' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div className="glass-card" style={{ padding: '1rem', overflow: 'hidden', background: '#000' }}>
                                    <video 
                                        controls 
                                        src={lesson.video_url} 
                                        style={{ width: '100%', borderRadius: '12px' }}
                                        poster={simplishTalksLogo}
                                    />
                                </div>
                                <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
                                    <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                                        <FileText size={20} color="var(--primary)" /> {language === 'kn' ? 'ಪಾಠದ ಪ್ರತಿಲಿಪಿ' : 'Lesson Transcription'}
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                        {lesson.transcription || (language === 'kn' ? 'ಈ ಪಾಠಕ್ಕೆ ಯಾವುದೇ ಪ್ರತಿಲಿಪಿ ಲಭ್ಯವಿಲ್ಲ.' : 'No transcription available for this lesson.')}
                                    </p>
                                </div>
                            </div>
                        )}
                        {activeTab === 'study' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <MagicShiftDashboard logicContent={lesson?.content?.logicContent} />
                                <SentenceEvolution evolutionContent={lesson?.content?.evolutionContent} />
                            </div>
                        )}
                        {activeTab === 'reading' && (
                            <div>
                                <ReadingLab readingContent={lesson?.content?.readingContent} />
                            </div>
                        )}
                        {activeTab === 'listening' && (
                            <div>
                                <ListeningLab transcription={lesson?.transcription} audioUrl={lesson?.audio_url} />
                            </div>
                        )}
                        {activeTab === 'vocabulary' && (
                            <div>
                                <VocabularyLab vocabularyContent={lesson?.content?.vocabularyContent} />
                            </div>
                        )}
                        {activeTab === 'test' && (
                            <div>
                                <MilestoneTest
                                    testContent={lesson?.content?.milestoneTest}
                                    lessonId={lesson?.id}
                                    onRevise={() => handleTabChange('study')}
                                    onBack={onBack}
                                    onNext={onNextLesson}
                                    onComplete={() => {
                                        // Still allow tracking if needed, but primary UI is now internal to MilestoneTest
                                        showToast("Progress Saved! (ಪ್ರಗತಿಯನ್ನು ಉಳಿಸಲಾಗಿದೆ!)", 'success');
                                    }}
                                />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Navigation Footer */}
            {!isExam && (
                <div style={{
                    marginTop: '3rem',
                    padding: '1.5rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '0 0 16px 16px'
                }}>
                    <div>
                        {activeTab !== 'study' && (
                            <button
                                onClick={() => {
                                    const sequence = ['study', 'reading', 'listening', 'vocabulary', 'test'];
                                    const currentIndex = sequence.indexOf(activeTab);
                                    handleTabChange(sequence[currentIndex - 1]);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="btn"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.8rem 1.5rem', color: 'var(--text-main)' }}
                            >
                                ← {language === 'kn' ? 'ಹಿಂದಿನ ವಿಭಾಗ' : 'Previous Section'}
                            </button>
                        )}
                    </div>
                    <div>
                        {activeTab !== 'test' && (
                            <button
                                onClick={() => {
                                    const sequence = ['study', 'reading', 'listening', 'vocabulary', 'test'];
                                    const currentIndex = sequence.indexOf(activeTab);
                                    handleTabChange(sequence[currentIndex + 1]);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="btn btn-primary"
                                style={{ padding: '0.8rem 2.5rem', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                            >
                                {language === 'kn' ? 'ಮುಂದಿನ ವಿಭಾಗ' : 'Next Section'}: {
                                    activeTab === 'video' ? (language === 'kn' ? 'ಅಧ್ಯಯನ' : 'Study') :
                                    activeTab === 'study' ? (language === 'kn' ? 'ಓದುವಿಕೆ' : 'Reading') :
                                        activeTab === 'reading' ? (language === 'kn' ? 'ಶ್ರವಣ' : 'Listening') :
                                            activeTab === 'listening' ? (language === 'kn' ? 'ಶಬ್ದಕೋಶ' : 'Vocabulary') : (language === 'kn' ? 'ಮೌಲ್ಯಮಾಪನ' : 'Test')
                                } →
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UniversalStudyArea;
