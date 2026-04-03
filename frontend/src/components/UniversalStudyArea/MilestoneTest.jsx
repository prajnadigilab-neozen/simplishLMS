import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, AlertCircle, RefreshCw, BookOpen, ArrowRight } from 'lucide-react';
import { useToast } from '../Toast';
import { lessonApi } from '../../utils/api';

const MilestoneTest = ({ testContent, lessonId, onComplete, onRevise, onBack, onNext }) => {
    const showToast = useToast();
    const [userAnswers, setUserAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // State for Matching Questions
    const [shuffledOptions, setShuffledOptions] = useState({});
    const [activeMatchLeft, setActiveMatchLeft] = useState(null); // { qIndex, item }

    useEffect(() => {
        if (!testContent) return;
        const initialShuffles = {};
        testContent.forEach((q, idx) => {
            if (q.type === 'Matching' && q.pairs) {
                // Fisher-Yates shuffle
                const items = [...q.pairs.map(p => p.kannada)];
                for (let i = items.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [items[i], items[j]] = [items[j], items[i]];
                }
                initialShuffles[idx] = items;
            }
        });
        setShuffledOptions(initialShuffles);
    }, [testContent]);

    if (!testContent || !Array.isArray(testContent) || testContent.length === 0) {
        return (
            <section className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3>No Test Content Available</h3>
                <p>There are no milestone questions configured for this lesson.</p>
            </section>
        );
    }

    const handleOptionSelect = (qIndex, option) => {
        if (submitted) return;
        setUserAnswers(prev => ({
            ...prev,
            [qIndex]: option
        }));
    };

    const handleTextChange = (qIndex, text) => {
        if (submitted) return;
        setUserAnswers(prev => ({
            ...prev,
            [qIndex]: text
        }));
    };

    const handleMatchClick = (qIndex, side, item) => {
        if (submitted || loading) return;

        if (side === 'left') {
            setActiveMatchLeft({ qIndex, item });
        } else if (side === 'right' && activeMatchLeft && activeMatchLeft.qIndex === qIndex) {
            // Form a match
            setUserAnswers(prev => {
                const currentMatches = { ...(prev[qIndex] || {}) };
                // Remove any existing match for this right item
                Object.keys(currentMatches).forEach(key => {
                    if (currentMatches[key] === item) delete currentMatches[key];
                });
                // Add new match
                currentMatches[activeMatchLeft.item] = item;
                return { ...prev, [qIndex]: currentMatches };
            });
            setActiveMatchLeft(null);
        }
    };

    const calculateScore = async () => {
        setLoading(true);
        try {
            let correctCount = 0;
            testContent.forEach((q, idx) => {
                if (q.type === 'Matching') {
                    const matches = userAnswers[idx] || {};
                    const isAllCorrect = q.pairs.every(p => matches[p.english] === p.kannada);
                    if (isAllCorrect && Object.keys(matches).length === q.pairs.length) {
                        correctCount++;
                    }
                } else if (q.options && q.options.length > 0) {
                    // MCQ
                    const actualAnswer = userAnswers[idx]; 
                    if (actualAnswer === q.correct_answer) correctCount++;
                } else {
                    // Text Translation - case insensitive
                    const userAnswer = (userAnswers[idx] || '').toString().trim().toLowerCase();
                    const correctAnswer = (q.correct_answer || '').toString().trim().toLowerCase();
                    if (userAnswer === correctAnswer && correctAnswer !== '') {
                        correctCount++;
                    }
                }
            });

            const finalScore = Math.round((correctCount / testContent.length) * 100);
            setScore(finalScore);
            setSubmitted(true);

            if (lessonId) {
                // Always save score, but only set completed status if passed
                const isPassed = finalScore >= 70;
                await lessonApi.updateProgress(lessonId, {
                    status: isPassed ? 'completed' : 'started',
                    score: finalScore,
                    completionPercentage: isPassed ? 100 : 50
                });
                // NOTE: onComplete is no longer called here to allow manual navigation
            }

            if (finalScore >= 70) {
                showToast(`ಆಹಾ! ಅದ್ಭುತ! (Great job!) You scored ${finalScore}%`, 'success');
            } else {
                showToast(`You scored ${finalScore}%. Keep practicing!`, 'error');
            }
        } catch (err) {
            console.error("Critical failure in calculateScore:", err);
            showToast("Something went wrong calculating your score. Please try again.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const resetTest = () => {
        setUserAnswers({});
        setSubmitted(false);
        setScore(0);
        setLoading(false);
    };

    const unansweredCount = testContent.length - Object.keys(userAnswers).length;

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem 0' }}>
                        <Target color="#ef4444" /> ಮೈಲಿಗಲ್ಲು ಪರೀಕ್ಷೆ (Milestone Test)
                    </h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Validate your progress through interactive challenges.</p>
                </div>
                {submitted && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => {
                                resetTest();
                                if (onRevise) onRevise();
                            }}
                            className="btn"
                            style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <RefreshCw size={16} /> Revise Lesson
                        </button>
                        <button onClick={resetTest} className="btn" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <RefreshCw size={16} /> Retry Test
                        </button>
                    </div>
                )}
            </div>

            {submitted && (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-card"
                    style={{
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        background: score >= 70 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)' : 'rgba(239, 68, 68, 0.1)',
                        border: `2px solid ${score >= 70 ? '#10b981' : '#ef4444'}`,
                        boxShadow: score >= 70 ? '0 10px 40px rgba(16, 185, 129, 0.2)' : 'none'
                    }}
                >
                    {score >= 70 ? (
                        <>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                            <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', color: '#10b981', fontWeight: 800 }}>
                                ಅಭಿನಂದನೆಗಳು! (Congratulations!)
                            </h2>
                            <p style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2.5rem auto' }}>
                                Mastered with a score of <strong>{score}%</strong>. You've successfully conquered this lesson's milestones!
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                    onClick={onBack}
                                    className="btn"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '1rem 2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                                >
                                    <BookOpen size={20} /> Explore More Lessons
                                </button>
                                <button
                                    onClick={onNext}
                                    className="btn btn-primary"
                                    style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}
                                >
                                    Continue to Next Lesson <ArrowRight size={20} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: '#ef4444' }}>
                                {score}%
                            </h3>
                            <p style={{ margin: 0, fontWeight: 600 }}>
                                Don't give up! Review the material and try again to clear this milestone.
                            </p>
                            <button
                                onClick={() => {
                                    resetTest();
                                    if (onRevise) onRevise();
                                }}
                                className="btn btn-primary"
                                style={{ marginTop: '2rem', padding: '0.8rem 2rem' }}
                            >
                                <RefreshCw size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Revise Now
                            </button>
                        </>
                    )}
                </motion.div>
            )}

            {testContent.map((q, idx) => {
                if (q.type === 'Matching') {
                    const matches = userAnswers[idx] || {};
                    const isCorrect = q.pairs.every(p => matches[p.english] === p.kannada) && Object.keys(matches).length === q.pairs.length;
                    
                    let cardStyle = { padding: '1.5rem', border: '1px solid var(--border)' };
                    if (submitted) {
                        cardStyle.border = isCorrect ? '2px solid #10b981' : '2px solid #ef4444';
                        cardStyle.background = isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                    }

                    return (
                        <div key={idx} className="glass-card" style={cardStyle}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                <span style={{ color: 'var(--primary)', marginRight: '0.5rem' }}>Q{idx + 1}.</span> {q.text || 'ಹೊಂದಾಣಿಕೆ ಮಾಡಿ (Match the following):'}
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* Left Column: English */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {q.pairs.map((p, pIdx) => {
                                        const isSelected = activeMatchLeft?.qIndex === idx && activeMatchLeft?.item === p.english;
                                        const isMatched = matches[p.english];
                                        return (
                                            <div 
                                                key={pIdx}
                                                onClick={() => handleMatchClick(idx, 'left', p.english)}
                                                style={{
                                                    padding: '0.8rem 1rem',
                                                    borderRadius: '0.5rem',
                                                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    background: isSelected ? 'var(--primary-light)' : (isMatched ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-dark)'),
                                                    cursor: submitted ? 'default' : 'pointer',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ fontWeight: 600 }}>{p.english}</span>
                                                {isMatched && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800 }}>→ {isCorrect || !submitted ? 'Linked' : 'Incorrect'}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Right Column: Kannada */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {(shuffledOptions[idx] || []).map((kan, kIdx) => {
                                        const isMatchedWith = Object.keys(matches).find(key => matches[key] === kan);
                                        const isCorrectMatch = isMatchedWith && q.pairs.find(p => p.english === isMatchedWith)?.kannada === kan;
                                        
                                        let itemStyle = {
                                            padding: '0.8rem 1rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--border)',
                                            background: isMatchedWith ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-card)',
                                            cursor: submitted ? 'default' : 'pointer',
                                            color: isMatchedWith ? 'var(--text-main)' : 'var(--text-muted)'
                                        };

                                        if (submitted && isMatchedWith) {
                                            itemStyle.border = isCorrectMatch ? '2px solid #10b981' : '2px solid #ef4444';
                                            itemStyle.background = isCorrectMatch ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                        }

                                        return (
                                            <div 
                                                key={kIdx}
                                                onClick={() => handleMatchClick(idx, 'right', kan)}
                                                style={itemStyle}
                                            >
                                                {kan}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {submitted && !isCorrect && (
                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
                                    <strong style={{ color: '#10b981', display: 'block', marginBottom: '0.5rem' }}>ಸರಿಯಾದ ಉತ್ತರಗಳು (Correct Matches):</strong>
                                    {q.pairs.map((p, pIdx) => (
                                        <div key={pIdx}>{p.english} = {p.kannada}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }

                const isMCQ = q.options && q.options.length > 0;
                const userAnswer = userAnswers[idx] || '';
                const isCorrect = isMCQ
                    ? userAnswer === q.correct_answer
                    : (userAnswer.toString().trim().toLowerCase() === (q.correct_answer || '').toString().trim().toLowerCase());

                let cardStyle = { padding: '1.5rem', border: '1px solid var(--border)' };
                if (submitted) {
                    cardStyle.border = isCorrect ? '2px solid #10b981' : '2px solid #ef4444';
                    cardStyle.background = isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                }

                return (
                    <div key={idx} className="glass-card" style={cardStyle}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                            <span style={{ color: 'var(--primary)', marginRight: '0.5rem' }}>Q{idx + 1}.</span> {q.text}
                        </h3>

                        {isMCQ ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {(Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? q.options.split(',').map(o => o.trim()) : [])).map((option, optIdx) => {
                                    const isSelected = userAnswer === option;
                                    const isCorrectOption = option === q.correct_answer;

                                    let optionStyle = {
                                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        borderRadius: '0.5rem', background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                                        cursor: (submitted || loading) ? 'default' : 'pointer', transition: 'all 0.2s', opacity: (submitted && !isSelected && !isCorrectOption) ? 0.6 : 1
                                    };

                                    if (submitted) {
                                        if (isCorrectOption) {
                                            optionStyle.border = '2px solid #10b981';
                                            optionStyle.background = 'rgba(16, 185, 129, 0.1)';
                                        } else if (isSelected && !isCorrectOption) {
                                            optionStyle.border = '2px solid #ef4444';
                                            optionStyle.background = 'rgba(239, 68, 68, 0.1)';
                                        }
                                    }

                                    return (
                                        <label key={optIdx} className="touch-target" style={optionStyle}>
                                            <input
                                                type="radio"
                                                name={`q_${idx}`}
                                                value={option}
                                                checked={isSelected}
                                                onChange={() => handleOptionSelect(idx, option)}
                                                disabled={submitted || loading}
                                                style={{ width: '20px', height: '20px', accentColor: submitted ? (isCorrectOption ? '#10b981' : '#ef4444') : 'var(--primary)' }}
                                            />
                                            <span style={{ fontSize: '1.1rem', fontWeight: isSelected ? 700 : 500 }}>{option}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : (
                            <div>
                                <textarea
                                    value={userAnswer}
                                    onChange={(e) => handleTextChange(idx, e.target.value)}
                                    disabled={submitted || loading}
                                    placeholder="Type your translation/answer here..."
                                    style={{ width: '100%', minHeight: '80px', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', resize: 'vertical', fontSize: '1rem' }}
                                />
                                {submitted && !isCorrect && (
                                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '0.5rem', fontWeight: 600 }}>
                                        Correct Answer: {q.correct_answer}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {!submitted && (
                <div style={{ marginTop: '1rem' }}>
                    {unansweredCount > 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1rem' }}>
                            <AlertCircle size={14} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                            {unansweredCount} question{unansweredCount > 1 ? 's' : ''} still remaining. You can still submit and they will be marked incorrect.
                        </p>
                    )}
                    <button
                        className="btn btn-primary touch-target"
                        style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)', opacity: loading ? 0.7 : 1 }}
                        onClick={calculateScore}
                        disabled={loading}
                    >
                        {loading ? (
                            <RefreshCw className="animate-spin" size={24} />
                        ) : (
                            <>
                                <CheckCircle2 size={24} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                Submit Answers
                            </>
                        )}
                    </button>
                </div>
            )}
        </section>
    );
};

export default MilestoneTest;
