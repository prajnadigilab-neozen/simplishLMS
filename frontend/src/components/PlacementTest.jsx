import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, Trophy, Loader2, Star } from 'lucide-react';
import { placementApi } from '../utils/api';
import { useToast } from './Toast';

const PlacementTest = ({ onComplete }) => {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { id: answer }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [finished, setFinished] = useState(null); // { level, scores }
    const showToast = useToast();

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const res = await placementApi.getQuestions();
            setQuestions(res.data);
            setLoading(false);
        } catch (err) {
            showToast('Failed to load English test questions. Please refresh.', 'error');
            setLoading(false);
        }
    };

    const handleSelect = (option) => {
        setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: option }));
    };

    const next = () => {
        if (!answers[questions[currentIndex].id]) {
            showToast('ದಯವಿಟ್ಟು ಒಂದು ಉತ್ತರವನ್ನು ಆಯ್ಕೆಮಾಡಿ (Please select an answer)', 'warning');
            return;
        }
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            submit();
        }
    };

    const prev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            const res = await placementApi.submit(answers);
            setFinished(res.data);
            showToast('ಅಭಿನಂದನೆಗಳು! ಪರೀಕ್ಷೆ ಮುಗಿದಿದೆ. (Congratulations! Test completed.)', 'success');
        } catch (err) {
            showToast('ಸಲ್ಲಿಕೆ ವಿಫಲವಾಗಿದೆ. (Submission failed.)', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={48} className="animate-spin" color="var(--primary)" />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>ಪರೀಕ್ಷೆಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ... (Preparing your test...)</p>
        </div>
    );

    if (finished) return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
            style={{ 
                maxWidth: '600px', 
                margin: window.innerWidth < 640 ? '2rem auto' : '4rem auto', 
                textAlign: 'center', 
                padding: window.innerWidth < 640 ? '1.5rem' : '3rem' 
            }}
        >
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <Trophy size={48} color="#f59e0b" />
            </div>
            <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '1rem' }}>ಪರೀಕ್ಷೆ ಪೂರ್ಣಗೊಂಡಿದೆ!</h1>
            <div style={{ marginBottom: '2rem' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    ನಿಮ್ಮ ಇಂಗ್ಲಿಷ್ ಮಟ್ಟ: <strong style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{finished.assignedLevel}</strong>
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    ಒಟ್ಟು ಅಂಕಗಳು: <strong style={{ color: 'var(--primary)' }}>{finished.scorePercentage}%</strong>
                </p>
            </div>

            <div style={{ background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem', textAlign: 'left', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star size={18} color="var(--primary)" /> ಪರೀಕ್ಷೆಯ ಸಾರಾಂಶ (Score Summary)
                </h3>
                {Object.entries(finished.scorePerLevel).map(([lvl, data]) => (
                    data.total > 0 && (
                        <div key={lvl} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <span>{lvl} Level:</span>
                            <span style={{ fontWeight: 600 }}>{data.correct} / {data.total}</span>
                        </div>
                    )
                ))}
            </div>

            <button className="btn btn-primary" onClick={() => onComplete(finished)} style={{ width: '100%', padding: '1rem' }}>
                ಕಲಿಕೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ (Start Learning)
            </button>
        </motion.div>
    );

    const q = questions[currentIndex];

    if (!q) return (
        <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>ಸ್ಥಳ ನಿರ್ಧಾರ ಪರೀಕ್ಷೆಯನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. (Unable to load placement test.)</p>
            <button className="btn" onClick={fetchQuestions} style={{ marginTop: '1rem' }}>ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ (Retry)</button>
        </div>
    );

    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div style={{ maxWidth: '700px', margin: '3rem auto', padding: '0 1.5rem' }}>
            {/* Header / Progress */}
            <header style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>ಪ್ರಶ್ನೆ {currentIndex + 1} / {questions.length}</span>
                    <span>{Math.round(progress)}% ಪೂರ್ಣಗೊಂಡಿದೆ</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        style={{ height: '100%', background: 'var(--primary)' }}
                    />
                </div>
            </header>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass-card"
                    style={{ 
                        padding: window.innerWidth < 640 ? '1.25rem' : '2.5rem', 
                        minHeight: window.innerWidth < 640 ? '300px' : '350px', 
                        display: 'flex', 
                        flexDirection: 'column' 
                    }}
                >
                    <div style={{ marginBottom: '2rem' }}>
                        <span style={{
                            padding: '4px 12px', background: 'var(--primary-light)',
                            color: 'var(--primary)', borderRadius: '20px', fontSize: '0.75rem',
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                            {q.difficulty_level}
                        </span>
                        <h2 style={{ 
                            fontSize: window.innerWidth < 640 ? '1.2rem' : '1.5rem', 
                            marginTop: '1rem', 
                            color: 'var(--text-main)', 
                            lineHeight: 1.4 
                        }}>
                            {q.question_text}
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', flex: 1 }}>
                        {q.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleSelect(opt)}
                                style={{
                                    padding: '1.25rem',
                                    borderRadius: '12px',
                                    border: `2px solid ${answers[q.id] === opt ? 'var(--primary)' : 'var(--border)'}`,
                                    background: answers[q.id] === opt ? 'var(--primary-light)' : 'var(--bg-card)',
                                    color: answers[q.id] === opt ? 'var(--primary)' : 'var(--text-main)',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '1rem'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        border: '1px solid currentColor', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem'
                                    }}>
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    {opt}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Footer Nav */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginTop: '2.5rem', 
                        paddingTop: '1.5rem', 
                        borderTop: '1px solid var(--border)',
                        gap: '0.5rem'
                    }}>
                        <button
                            className="btn"
                            disabled={currentIndex === 0}
                            onClick={prev}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.4rem', 
                                background: 'none', 
                                border: '1px solid var(--border)', 
                                color: 'var(--text-main)',
                                padding: window.innerWidth < 640 ? '0.6rem 0.8rem' : '0.75rem 1.25rem',
                                fontSize: window.innerWidth < 640 ? '0.85rem' : '1rem'
                            }}
                        >
                            <ChevronLeft size={18} /> {window.innerWidth < 400 ? 'ಹಿಂದೆ' : 'ಹಿಂದೆ (Back)'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={next}
                            disabled={submitting}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.4rem', 
                                padding: window.innerWidth < 640 ? '0.6rem 1rem' : '0.75rem 2.5rem',
                                fontSize: window.innerWidth < 640 ? '0.85rem' : '1rem'
                            }}
                        >
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : (currentIndex === questions.length - 1 ? (window.innerWidth < 400 ? 'ಮುಗಿಸಿ' : 'ಅಂತಿಮಗೊಳಿಸಿ (Finish)') : (window.innerWidth < 400 ? 'ಮುಂದೆ' : 'ಮುಂದೆ (Next)'))}
                            {!submitting && <ChevronRight size={18} />}
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default PlacementTest;
