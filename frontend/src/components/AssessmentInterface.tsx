import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Loader2, Zap, RefreshCw, ArrowRight } from 'lucide-react';
import { assessmentApi, lessonApi } from '../utils/api';
import { useUser } from '../context/UserContext';
import VoiceRecorder from './VoiceRecorder';
import ImageUpload from './ImageUpload';
import { User, Lesson, Question, Assessment as AssessmentType } from '../types';

// Atomic Components
import AssessmentHeader from './Assessment/AssessmentHeader';
import MCQQuestion from './Assessment/MCQQuestion';
import MatchingQuestion from './Assessment/MatchingQuestion';
import FeedbackBlock from './Assessment/FeedbackBlock';

interface AssessmentInterfaceProps {
    user?: User;
    lessonId?: string;
    onNextLesson?: (lesson: Lesson) => void;
}

const parseOptions = (options: any): string[] => {
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

const AssessmentInterface: React.FC<AssessmentInterfaceProps> = ({ user: propUser, lessonId = 'any', onNextLesson }) => {
    const { user: contextUser, language } = useUser();
    const user = (contextUser || propUser) as User | undefined;
    
    const isPaid = user?.is_paid || ['super_admin', 'admin', 'moderator'].includes(user?.role?.toLowerCase() || '');
    const [assessment, setAssessment] = useState<AssessmentType | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [currentMedia, setCurrentMedia] = useState<Blob | File | null>(null);
    const [checking, setChecking] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [resultData, setResultData] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    
    // Matching State
    const [shuffledOptions, setShuffledOptions] = useState<Record<number, string[]>>({});
    const [activeMatchLeft, setActiveMatchLeft] = useState<string | null>(null);
    const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});

    // Auto-Navigation States
    const [nextLesson, setNextLesson] = useState<Lesson| null>(null);
    const [isCurriculumComplete, setIsCurriculumComplete] = useState(false);
    const [loadingNextLesson, setLoadingNextLesson] = useState(false);
    const [freeLessonIds, setFreeLessonIds] = useState<string[]>([]);
    const [basicLessonsCount, setBasicLessonsCount] = useState(0);

    useEffect(() => {
        const fetchAssessment = async () => {
            try {
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

    useEffect(() => {
        if (isFinished && resultData?.passed) {
            const calculateNextLesson = async () => {
                setLoadingNextLesson(true);
                try {
                    const response = await lessonApi.getAll();
                    
                    // Mark current lesson as completed in the DB as a robust fallback
                    try {
                        await lessonApi.updateProgress(lessonId, {
                            status: 'completed',
                            completionPercentage: 100,
                            progress: 100
                        });
                    } catch (pErr) {
                        console.warn("Failed to update progress from frontend:", pErr);
                    }

                    const allLessons: Lesson[] = response.data.lessons || [];
                    const levels = ["Basic", "Intermediate", "Advanced", "Expert"];

                    const sortedLessons = [...allLessons].sort((a, b) => {
                        const levelDiff = levels.indexOf(a.level) - levels.indexOf(b.level);
                        if (levelDiff !== 0) return levelDiff;
                        return (a.display_order || 0) - (b.display_order || 0);
                    });

                    const currentIndex = sortedLessons.findIndex(l => l.id === lessonId);
                    const basicLevelLessons = sortedLessons.filter(l => l.level === 'Basic');
                    setBasicLessonsCount(sortedLessons.length);
                    setFreeLessonIds(basicLevelLessons.slice(0, 2).map(l => l.id));

                    if (currentIndex !== -1 && currentIndex + 1 < sortedLessons.length) {
                        setNextLesson(sortedLessons[currentIndex + 1]);
                    } else if (currentIndex !== -1 && currentIndex + 1 >= sortedLessons.length) {
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
            let userResultText = selectedOption || "";

            if (q.type === 'Matching') {
                const pairs = q.pairs || [];
                isCorrect = pairs.every(p => matchingAnswers[p.english] === p.kannada) && 
                            Object.keys(matchingAnswers).length === pairs.length;
                userResultText = Object.entries(matchingAnswers).map(([k, v]) => `${k}-${v}`).join(', ');
            } else {
                const cleanText = (text: string) => (text || "").toString().trim().toLowerCase().replace(/[^a-z0-9\u0C80-\u0CFF\s]/gi, "");
                const userClean = cleanText(userResultText);
                const correctClean = cleanText(q.correct_answer);
                isCorrect = userClean === correctClean && userClean !== "";
            }

            setAnswers({ ...answers, [q.id]: userResultText });
            setFeedback(isCorrect ? 'correct' : 'incorrect');
        } catch (err) {
            console.error("Check Error:", err);
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
            const uid = user?.id || 'f0000000-0000-0000-0000-000000000000';
            try {
                const formData = new FormData();
                formData.append('userId', uid);
                formData.append('assessmentId', assessment?.id || '');
                formData.append('answers', JSON.stringify(answers));

                const response = await assessmentApi.submit(formData);
                setResultData(response.data.result);
                setIsFinished(true);
            } catch (err) {
                console.error("Error submitting assessment:", err);
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
                <AssessmentHeader 
                    currentQuestion={currentQuestion} 
                    totalQuestions={questions.length} 
                    onExit={() => window.location.href = '/library'} 
                />

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
                        {!feedback ? (
                            <>
                                {q.type === 'MCQ' && (
                                    <MCQQuestion 
                                        options={parseOptions(q.options)} 
                                        selectedOption={selectedOption} 
                                        onSelect={setSelectedOption} 
                                    />
                                )}

                                {q.type === 'Text' && (
                                    <textarea
                                        style={{
                                            width: '100%', padding: '1.5rem', fontSize: '1.1rem',
                                            background: 'rgba(255,255,255,0.02)', color: '#fff',
                                            height: '180px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.05)',
                                            resize: 'none', outline: 'none', transition: 'border-color 0.2s'
                                        }}
                                        value={selectedOption || ''}
                                        onChange={(e) => setSelectedOption(e.target.value)}
                                        placeholder="ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ..."
                                        autoFocus
                                    />
                                )}

                                {q.type === 'Voice' && (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <VoiceRecorder onRecordingComplete={setCurrentMedia} />
                                        <p className="mt-4 text-[#94a3b8]">ಮಾತನಾಡಿ ಮತ್ತು ರೆಕಾರ್ಡ್ ಮಾಡಿ (Speak and record)</p>
                                    </div>
                                )}

                                {q.type === 'Image' && (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <ImageUpload onImageSelected={setCurrentMedia} />
                                        <p className="mt-4 text-[#94a3b8]">ಚಿತ್ರವನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ (Upload an image)</p>
                                    </div>
                                )}

                                {q.type === 'Matching' && (
                                    <MatchingQuestion 
                                        pairs={q.pairs || []} 
                                        shuffledOptions={shuffledOptions[currentQuestion] || []} 
                                        activeMatchLeft={activeMatchLeft} 
                                        matchingAnswers={matchingAnswers} 
                                        onSelectLeft={setActiveMatchLeft} 
                                        onSelectRight={(kan) => {
                                            if (activeMatchLeft) {
                                                setMatchingAnswers(prev => ({ ...prev, [activeMatchLeft]: kan }));
                                                setActiveMatchLeft(null);
                                            }
                                        }} 
                                    />
                                )}
                            </>
                        ) : (
                            <FeedbackBlock 
                                feedback={feedback} 
                                userAnswer={answers[q.id] || selectedOption || '...'} 
                                correctAnswer={q.correct_answer} 
                            />
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
                                    background: (selectedOption || currentMedia || Object.keys(matchingAnswers).length > 0) ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    opacity: (selectedOption || currentMedia || Object.keys(matchingAnswers).length > 0) ? 1 : 0.5,
                                    fontSize: '1.1rem',
                                    boxShadow: (selectedOption || currentMedia || Object.keys(matchingAnswers).length > 0) ? '0 10px 20px rgba(99, 102, 241, 0.3)' : 'none'
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
