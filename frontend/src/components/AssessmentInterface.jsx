import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, Trophy, Loader2, Zap, RefreshCw } from 'lucide-react';
import { assessmentApi, lessonApi } from '../utils/api';
import VoiceRecorder from './VoiceRecorder';
import ImageUpload from './ImageUpload';

// Safely parse options regardless of format (Array, Postgres string, JSON string)
const parseOptions = (options) => {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    if (typeof options === 'string') {
        if (options.startsWith('{') && options.endsWith('}')) {
            return options.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        }
        try { return JSON.parse(options); } catch { return [options]; }
    }
    return [];
};

const AssessmentInterface = ({ user, lessonId = 'any', onNextLesson }) => {
    const isPaid = user?.is_paid || ['super_admin', 'admin', 'moderator'].includes(user?.role?.toLowerCase());
    const [assessment, setAssessment] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [currentMedia, setCurrentMedia] = useState(null); // Blob or File
    const [checking, setChecking] = useState(false);
    const [feedback, setFeedback] = useState(null); // 'correct' or 'incorrect'
    const [loading, setLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [answers, setAnswers] = useState({});
    
    // Matching State
    const [shuffledOptions, setShuffledOptions] = useState({});
    const [activeMatchLeft, setActiveMatchLeft] = useState(null); // { item }
    const [matchingAnswers, setMatchingAnswers] = useState({}); // { english: kannada }

    // Auto-Navigation States
    const [nextLesson, setNextLesson] = useState(null);
    const [isCurriculumComplete, setIsCurriculumComplete] = useState(false);
    const [loadingNextLesson, setLoadingNextLesson] = useState(false);
    const [freeLessonIds, setFreeLessonIds] = useState([]);
    const [basicLessonsCount, setBasicLessonsCount] = useState(0);

    useEffect(() => {
        const fetchAssessment = async () => {
            try {
                // If it's a demo/any, we could fetch a specific one or the first one
                // For this implementation, we assume we have a lessonId or fetch first
                const response = await assessmentApi.getByLesson(lessonId);
                setAssessment(response.data.assessment);
                setQuestions(response.data.questions);
            } catch (err) {
                console.error("Error fetching assessment:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssessment();
    }, [lessonId]);

    // Shuffle Matching Options
    useEffect(() => {
        if (!questions || !questions[currentQuestion]) return;
        const q = questions[currentQuestion];
        if (q.type === 'Matching' && q.pairs) {
            const items = [...q.pairs.map(p => p.kannada)];
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
            setShuffledOptions(prev => ({ ...prev, [currentQuestion]: items }));
            setMatchingAnswers({});
            setActiveMatchLeft(null);
        }
    }, [currentQuestion, questions]);

    // Calculate Next Lesson once Assessment is Finished
    useEffect(() => {
        if (isFinished && resultData?.passed) {
            const calculateNextLesson = async () => {
                setLoadingNextLesson(true);
                try {
                    const response = await lessonApi.getAll();
                    const allLessons = response.data.lessons || [];

                    const levels = ["Basic", "Intermediate", "Advanced", "Expert"];

                    // Sort lessons canonically
                    const sortedLessons = [...allLessons].sort((a, b) => {
                        const levelDiff = levels.indexOf(a.level) - levels.indexOf(b.level);
                        if (levelDiff !== 0) return levelDiff;
                        return (a.display_order || 0) - (b.display_order || 0);
                    });

                        // Find where the user currently is
                        const currentIndex = sortedLessons.findIndex(l => l.id === lessonId);

                        // Calculate free lesson IDs for paywall
                        const basicLevelLessons = sortedLessons.filter(l => l.level === 'Basic');
                        setBasicLessonsCount(sortedLessons.length);
                        setFreeLessonIds(basicLevelLessons.slice(0, 2).map(l => l.id));

                        if (currentIndex !== -1 && currentIndex + 1 < sortedLessons.length) {
                            // There is a next lesson
                            setNextLesson(sortedLessons[currentIndex + 1]);
                        } else if (currentIndex !== -1 && currentIndex + 1 >= sortedLessons.length) {
                            // They finished the final lesson in the entire array
                            setIsCurriculumComplete(true);
                        }
                } catch (err) {
                    console.error("Failed to calculate next lesson:", err);
                } finally {
                    setLoadingNextLesson(false);
                }
            };
            calculateNextLesson();
        }
    }, [isFinished, resultData, lessonId]);

    const handleCheck = async () => {
        const q = questions[currentQuestion];
        setChecking(true);

        try {
            let isCorrect = false;

            if (q.type === 'Matching') {
                const pairs = q.pairs || [];
                isCorrect = pairs.every(p => matchingAnswers[p.english] === p.kannada) && 
                            Object.keys(matchingAnswers).length === pairs.length;
                userResultText = Object.entries(matchingAnswers).map(([k, v]) => `${k}-${v}`).join(', ');
            } else {
                const cleanText = (text) => (text || "").toString().trim().toLowerCase().replace(/[^a-z0-9\u0C80-\u0CFF\s]/gi, "");
                const userClean = cleanText(userResultText);
                const correctClean = cleanText(q.correct_answer);
                isCorrect = userClean === correctClean && userClean !== "";
            }

            setAnswers({ ...answers, [q.id]: userResultText });
            setFeedback(isCorrect ? 'correct' : 'incorrect');
        } catch (err) {
            console.error("Check Error:", err);
            alert("Processing failed. Please try again.");
        } finally {
            setChecking(false);
        }
    };

    const handleNext = async () => {
        if (currentQuestion + 1 < questions.length) {
            setFeedback(null);
            setSelectedOption(null);
            setCurrentMedia(null);
            setCurrentQuestion((prev) => prev + 1);
        } else {
            // Last question - Submit everything to backend
            const userStr = localStorage.getItem('simplish_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const uid = user?.id || 'f0000000-0000-0000-0000-000000000000';

            try {
                const formData = new FormData();
                formData.append('userId', uid);
                formData.append('assessmentId', assessment.id);
                formData.append('answers', JSON.stringify(answers));

                const response = await assessmentApi.submit(formData);
                setResultData(response.data.result);
                setIsFinished(true);
            } catch (err) {
                console.error("Error submitting assessment:", err);
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-10 glass-card">
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-center" style={{
                minHeight: '100vh',
                background: 'var(--bg-dark)',
                color: 'var(--text-main)',
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                overflowY: 'auto'
            }}>
                <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                    style={{ marginBottom: '2rem' }}
                >
                    <Trophy size={100} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))' }} />
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--primary)' }}
                >
                    {resultData?.passed ? 'Mastery Achieved! 🏆' : 'Keep Pushing! 💪'}
                </motion.h2>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {resultData?.passed ? 'ಅಭಿನಂದನೆಗಳು! ನೀವು ಯಶಸ್ವಿಯಾಗಿದ್ದೀರಿ.' : 'ಉತ್ತಮ ಪ್ರಯತ್ನ! ಮುಂದಿನ ಬಾರಿ ಇನ್ನಷ್ಟು ಉತ್ತಮವಾಗಿ ಮಾಡಿ.'}
                </p>

                <div style={{ position: 'relative', marginBottom: '3rem' }}>
                    <svg width="180" height="180" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <motion.circle
                            cx="60" cy="60" r="54" fill="none"
                            stroke={resultData?.passed ? '#10b981' : '#f59e0b'} strokeWidth="8"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: (resultData?.score || 0) / 100 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            transform="rotate(-90 60 60)"
                        />
                    </svg>
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)'
                    }}>
                        {resultData?.score}<span style={{ fontSize: '1rem', opacity: 0.6 }}>%</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '400px' }}>
                    {!loadingNextLesson && nextLesson && resultData?.passed && onNextLesson && (
                        (() => {
                            const isNextLocked = !isPaid && !freeLessonIds.includes(nextLesson.id);
                            if (isNextLocked) {
                                return (
                                    <button
                                        className="btn"
                                        onClick={() => window.location.href = '/payment'}
                                        style={{ background: 'var(--accent)', color: '#000', width: '100%', padding: '1rem', fontWeight: 900 }}
                                    >
                                        <Zap size={18} /> Unlock {basicLessonsCount}+ Lessons
                                    </button>
                                );
                            }
                            return (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => onNextLesson(nextLesson)}
                                    style={{ width: '100%', padding: '1rem' }}
                                >
                                    Next: {nextLesson.title} <ArrowRight size={18} />
                                </button>
                            );
                        })()
                    )}

                    {!resultData?.passed && (
                        <button
                            className="btn retry-btn"
                            onClick={() => {
                                setIsFinished(false);
                                setCurrentQuestion(0);
                                setSelectedOption(null);
                                setFeedback(null);
                            }}
                            style={{ width: '100%', padding: '1rem' }}
                        >
                            <RefreshCw size={18} /> {language === 'kn' ? 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' : 'Retry Test'}
                        </button>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                        <button
                            className="btn"
                            onClick={() => window.location.href = '/'}
                            style={{ background: 'var(--primary-light)', color: 'var(--primary)', flex: 1, padding: '0.75rem' }}
                        >
                            Home
                        </button>
                        <button
                            className="btn"
                            onClick={() => window.location.href = '/library'}
                            style={{ background: 'var(--primary-light)', color: 'var(--primary)', flex: 1, padding: '0.75rem' }}
                        >
                            Library
                        </button>
                    </div>
                </div>

                <style>{`
                    .assessment-btn {
                        border: none;
                        border-radius: 16px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.75rem;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        color: #fff;
                        font-weight: 700;
                        text-decoration: none;
                        padding: 1rem;
                    }
                    .assessment-btn:hover { transform: translateY(-4px); filter: brightness(1.1); }
                `}</style>
            </div>
        );
    }

    if (!questions.length) {
        return (
            <div className="flex items-center justify-center p-10" style={{ minHeight: '80vh' }}>
                <div style={{ color: '#94a3b8', textAlign: 'center' }}>
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <h2>Preparing your challenge...</h2>
                </div>
            </div>
        );
    }

    const q = questions[currentQuestion];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            color: '#fff',
            padding: '1.5rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div className="max-w-4xl mx-auto">
                {/* Header Stats */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Question {currentQuestion + 1} of {questions.length}
                        </span>
                        <div style={{ width: '240px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginTop: '0.5rem', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '10px' }}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.href = '/library'}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Exit
                    </button>
                </header>

                <motion.div
                    key={q.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        background: 'var(--bg-card)',
                        padding: '1.5rem',
                        borderRadius: '24px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                    }}
                >
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '1.5rem' }}>
                            {q.text}
                        </h2>
                    </div>

                    <div style={{ minHeight: '240px' }}>
                        {q.type === 'MCQ' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                {(parseOptions(q.options)).map((opt) => {
                                    const isSelected = selectedOption === opt;
                                    return (
                                        <motion.div
                                            key={opt}
                                            whileHover={{ scale: feedback ? 1 : 1.02 }}
                                            whileTap={{ scale: feedback ? 1 : 0.98 }}
                                            onClick={() => !feedback && setSelectedOption(opt)}
                                            style={{
                                                padding: '1.5rem',
                                                cursor: feedback ? 'default' : 'pointer',
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
                        )}

                        {q.type === 'Text' && !feedback && (
                            <textarea
                                style={{
                                    width: '100%', padding: '1.5rem', fontSize: '1.1rem',
                                    background: 'rgba(255,255,255,0.02)', color: '#fff',
                                    height: '180px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.05)',
                                    resize: 'none', outline: 'none', transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                                value={selectedOption || ''}
                                onChange={(e) => setSelectedOption(e.target.value)}
                                placeholder="ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ..."
                                autoFocus
                            />
                        )}

                        {q.type === 'Voice' && !feedback && (
                            <div className="flex flex-col items-center justify-center py-10">
                                <VoiceRecorder onRecordingComplete={setCurrentMedia} />
                                <p className="mt-4 text-[#94a3b8]">ಮಾತನಾಡಿ ಮತ್ತು ರೆಕಾರ್ಡ್ ಮಾಡಿ (Speak and record)</p>
                            </div>
                        )}

                        {q.type === 'Image' && !feedback && (
                            <div className="flex flex-col items-center justify-center py-10">
                                <ImageUpload onImageSelected={setCurrentMedia} />
                                <p className="mt-4 text-[#94a3b8]">ಚಿತ್ರವನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ (Upload an image)</p>
                            </div>
                        )}

                        {q.type === 'Matching' && !feedback && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {(q.pairs || []).map((p, pIdx) => {
                                        const isSelected = activeMatchLeft?.item === p.english;
                                        const isMatched = matchingAnswers[p.english];
                                        return (
                                            <div 
                                                key={pIdx}
                                                onClick={() => !feedback && setActiveMatchLeft({ item: p.english })}
                                                style={{
                                                    padding: '1rem', borderRadius: '1rem',
                                                    border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.1)' : (isMatched ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)'),
                                                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ fontWeight: 600 }}>{p.english}</span>
                                                {isMatched && <span style={{ fontSize: '0.7rem', color: '#10b981' }}>Linked</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {(shuffledOptions[currentQuestion] || []).map((kan, kIdx) => {
                                        const isMatchedWith = Object.keys(matchingAnswers).find(key => matchingAnswers[key] === kan);
                                        return (
                                            <div 
                                                key={kIdx}
                                                onClick={() => {
                                                    if (!feedback && activeMatchLeft) {
                                                        setMatchingAnswers(prev => ({ ...prev, [activeMatchLeft.item]: kan }));
                                                        setActiveMatchLeft(null);
                                                    }
                                                }}
                                                style={{
                                                    padding: '1rem', borderRadius: '1rem',
                                                    border: isMatchedWith ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                                    background: isMatchedWith ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                                    cursor: activeMatchLeft ? 'pointer' : 'default',
                                                    color: isMatchedWith ? '#fff' : '#94a3b8'
                                                }}
                                            >
                                                {kan}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
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
                                <p style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>"{answers[q.id] || selectedOption || '...'}"</p>

                                {feedback === 'incorrect' && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Correct Answer:</p>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>{q.correct_answer}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    <footer style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end' }}>
                        {!feedback ? (
                            <button
                                className="assessment-btn"
                                onClick={handleCheck}
                                disabled={checking || (!selectedOption && !currentMedia && Object.keys(matchingAnswers).length < (q.pairs?.length || 0))}
                                style={{
                                    padding: '1rem 3rem',
                                    background: (selectedOption || currentMedia) ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    opacity: (selectedOption || currentMedia) ? 1 : 0.5,
                                    fontSize: '1.1rem',
                                    boxShadow: (selectedOption || currentMedia) ? '0 10px 20px rgba(99, 102, 241, 0.3)' : 'none'
                                }}
                            >
                                {checking ? <Loader2 className="animate-spin" /> : "Check Answer"}
                            </button>
                        ) : (
                            <button
                                className="assessment-btn"
                                onClick={handleNext}
                                style={{
                                    padding: '1rem 3rem',
                                    background: currentQuestion + 1 < questions.length ? 'rgba(255,255,255,0.05)' : '#10b981',
                                    fontSize: '1.1rem'
                                }}
                            >
                                {currentQuestion + 1 < questions.length ? 'Next' : 'Submit'} <ArrowRight size={20} />
                            </button>
                        )}
                    </footer>
                </motion.div>
            </div>

            <style>{`
                .assessment-btn {
                    border: none;
                    border-radius: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    color: #fff;
                    font-weight: 700;
                    text-decoration: none;
                }
                .assessment-btn:hover:not(:disabled) { transform: translateY(-4px); filter: brightness(1.1); }
                .assessment-btn:disabled { cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default AssessmentInterface;
