import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, ChevronRight, RefreshCcw, Sparkles, Trophy } from 'lucide-react';
import api from '../../utils/api';
import simplishTalksLogo from '../../assets/logo_final.png';
import { useUser } from '../../context/UserContext';

const ExamInterface = ({ examData, lessonId, onComplete, isReview, dbScore }) => {
    const { user, language } = useUser();
    const [currentStep, setCurrentStep] = useState(() => isReview ? 'review' : 'intro'); // intro, test, result, review
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState(() => {
        if (isReview) {
            const saved = localStorage.getItem(`simplish_exam_answers_${lessonId}`);
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });
    const [showRationale, setShowRationale] = useState(false);
    const [score, setScore] = useState(0);

    const { module_header, test_metadata, test_content = [], answer_key = {}, graduation_retention_block } = examData || {};

    useEffect(() => {
        if (isReview && test_content && test_content.length > 0) {
            let correctCount = 0;
            const savedAnswers = localStorage.getItem(`simplish_exam_answers_${lessonId}`);
            if (savedAnswers) {
                const parsed = JSON.parse(savedAnswers);
                test_content.forEach((q, idx) => {
                    const correctLetter = answer_key[q.question_number] || q.correct_answer;
                    if (parsed[idx] === correctLetter) {
                        correctCount++;
                    }
                });
                setScore(correctCount);
            } else if (dbScore !== undefined && dbScore !== null) {
                const calculatedCorrect = Math.round((dbScore / 100) * test_content.length);
                setScore(calculatedCorrect);
            }
        }
    }, [isReview, examData, lessonId, dbScore]);

    const handleStart = () => {
        setCurrentStep('test');
        setCurrentQuestionIndex(0);
        setAnswers({});
        setScore(0);
        setShowRationale(false);
        localStorage.removeItem(`simplish_exam_answers_${lessonId}`);
    };

    const handleAnswerSelect = (optionString) => {
        if (showRationale) return; // Prevent changing answer after submitting

        // Extract the letter from "A) Option text"
        const selectedLetter = optionString.substring(0, 1).toUpperCase();

        setAnswers({
            ...answers,
            [currentQuestionIndex]: selectedLetter
        });
    };

    const handleSubmitAnswer = () => {
        if (!answers[currentQuestionIndex]) return;

        const currentQ = test_content[currentQuestionIndex];
        const correctLetter = answer_key[currentQ.question_number] || currentQ.correct_answer;

        if (answers[currentQuestionIndex] === correctLetter) {
            setScore(prev => prev + 1);
        }

        setShowRationale(true);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < test_content.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setShowRationale(false);
        } else {
            finishExam();
        }
    };

    const finishExam = async () => {
        localStorage.setItem(`simplish_exam_answers_${lessonId}`, JSON.stringify(answers));
        setCurrentStep('result');

        // Dynamically compute score from answers to avoid React state race conditions
        let correctCount = 0;
        test_content.forEach((q, idx) => {
            const correctLetter = answer_key[q.question_number] || q.correct_answer;
            if (answers[idx] === correctLetter) {
                correctCount++;
            }
        });
        setScore(correctCount);

        const finalScore = Math.round((correctCount / (test_content.length || 1)) * 100);

        try {
            await api.post(`/lessons/${lessonId}/progress`, {
                score: finalScore,
                status: 'completed',
                completionPercentage: 100
            });
        } catch (error) {
            console.error("Failed to save exam results", error);
        }
    };

    if (currentStep === 'review') {
        const hasSavedAnswers = Object.keys(answers).length > 0;

        return (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-dark)', borderRadius: '1.5rem',
                    border: '1px solid var(--border)'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            <Trophy color="#eab308" size={28} /> {language === 'kn' ? 'ಅಂತಿಮ ಪದವಿ ಪರೀಕ್ಷೆ ವಿಶ್ಲೇಷಣೆ' : 'Final Graduation Exam Review'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span>{language === 'kn' ? 'ನಿಮ್ಮ ಉತ್ತರಗಳು ಮತ್ತು ವಿವರಣೆಗಳನ್ನು ಕೆಳಗೆ ಪರಿಶೀಲಿಸಿ.' : 'Review your selected answers and explanations below.'}</span>
                            {(hasSavedAnswers || (dbScore !== undefined && dbScore !== null)) && (
                                <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '0.15rem 0.5rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.85rem' }}>
                                    {language === 'kn' ? `ಗಳಿಸಿದ ಅಂಕಗಳು: ${Math.round((score / (test_content.length || 1)) * 100)}%` : `Score: ${Math.round((score / (test_content.length || 1)) * 100)}%`}
                                </span>
                            )}
                        </p>
                    </div>
                    <button 
                        className="btn" 
                        onClick={() => onComplete('library')} 
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.75rem 1.5rem', color: 'var(--text-main)' }}
                    >
                        {language === 'kn' ? 'ಲೈಬ್ರರಿಗೆ ಹಿಂತಿರುಗಿ' : 'Back to Library'}
                    </button>
                </div>

                {!hasSavedAnswers && (
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        background: 'rgba(234, 179, 8, 0.08)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: '1.25rem',
                        color: 'var(--text-main)',
                        marginBottom: '2rem',
                        fontSize: '0.95rem',
                        lineHeight: '1.5'
                    }}>
                        <strong style={{ color: '#eab308' }}>{language === 'kn' ? 'ಗಮನಿಸಿ (Note):' : 'Note:'}</strong>{' '}
                        {language === 'kn' 
                            ? 'ನಿಮ್ಮ ನಿರ್ದಿಷ್ಟ ಉತ್ತರಗಳ ಇತಿಹಾಸವು ಈ ಸಾಧನದಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ (ಬಹುಶಃ ನೀವು ಸಾಧನವನ್ನು ಬದಲಾಯಿಸಿದ್ದೀರಿ ಅಥವಾ ಬ್ರೌಸರ್ ಸಂಗ್ರಹವನ್ನು ತೆರವುಗೊಳಿಸಿದ್ದೀರಿ). ಆದ್ದರಿಂದ ಕೇವಲ ಸರಿಯಾದ ಉತ್ತರಗಳನ್ನು ಮಾತ್ರ ಕೆಳಗೆ ಹೈಲೈಟ್ ಮಾಡಲಾಗಿದೆ.' 
                            : 'Your detailed option selections are stored locally on your device. Since you took this exam on another device or cleared your browser cache, your specific incorrect answers are not marked in red. Only the correct answers are highlighted in green below.'}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {test_content.map((q, qIdx) => {
                        const correctLetter = answer_key[q.question_number] || q.correct_answer;
                        const selectedLetter = answers[qIdx];
                        const isCorrect = selectedLetter === correctLetter;

                        return (
                            <motion.div
                                key={qIdx}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: qIdx * 0.03 }}
                                className="glass-card"
                                style={{
                                    padding: '2rem',
                                    border: `1px solid ${selectedLetter ? (isCorrect ? '#22c55e' : '#ef4444') : 'var(--border)'}`,
                                    background: selectedLetter ? (isCorrect ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.02) 0%, transparent 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, transparent 100%)') : 'var(--bg-card)'
                                }}
                            >
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                                        Question {qIdx + 1}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <span style={{ background: 'var(--bg-dark)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {q.topic}
                                        </span>
                                        <span style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', color: '#eab308' }}>
                                            {q.level}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                                        {q.question_english}
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0 }}>
                                        {q.question_kannada}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    {q.options?.map((opt, idx) => {
                                        const optLetter = opt.replace(/^\//, '').substring(0, 1).toUpperCase();
                                        const isSelected = selectedLetter === optLetter;
                                        const isCorrectOpt = optLetter === correctLetter;

                                        let border = '1px solid var(--border)';
                                        let bg = 'var(--bg-dark)';
                                        let badge = null;

                                        if (isCorrectOpt) {
                                            border = '2px solid #22c55e';
                                            bg = 'rgba(34, 197, 94, 0.1)';
                                            badge = (
                                                <span style={{
                                                    background: '#22c55e', color: '#fff', fontSize: '0.75rem',
                                                    padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800
                                                }}>
                                                    {language === 'kn' ? 'ಸರಿಯಾದ ಉತ್ತರ' : 'Correct'}
                                                </span>
                                            );
                                        } else if (isSelected) {
                                            border = '2px solid #ef4444';
                                            bg = 'rgba(239, 68, 68, 0.1)';
                                            badge = (
                                                <span style={{
                                                    background: '#ef4444', color: '#fff', fontSize: '0.75rem',
                                                    padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800
                                                }}>
                                                    {language === 'kn' ? 'ನಿಮ್ಮ ಉತ್ತರ' : 'Your Answer'}
                                                </span>
                                            );
                                        }

                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: '1rem 1.25rem', borderRadius: '1rem',
                                                    background: bg, border: border, color: 'var(--text-main)',
                                                    fontSize: '1.05rem', display: 'flex', justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <span>{opt.replace(/^\//, '')}</span>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {isSelected && isCorrectOpt && (
                                                        <span style={{
                                                            background: '#22c55e', color: '#fff', fontSize: '0.75rem',
                                                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800
                                                        }}>
                                                            {language === 'kn' ? 'ನಿಮ್ಮ ಉತ್ತರ' : 'Your Answer'}
                                                        </span>
                                                    )}
                                                    {badge}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{
                                    padding: '1.25rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 800 }}>
                                        <CheckCircle2 size={16} /> {language === 'kn' ? 'ವಿವರಣೆ' : 'Explanation'}
                                    </h4>
                                    <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
                                        {q.rationale_kannada}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', marginBottom: '4rem' }}>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => onComplete('library')} 
                        style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
                    >
                        {language === 'kn' ? 'ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಳಿಸಿ' : 'Finish Review'}
                    </button>
                </div>
            </div>
        );
    }

    if (currentStep === 'intro') {
        return (
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card" style={{ padding: '3rem', border: '2px solid var(--primary)' }}
                >
                    <Target size={64} color="var(--primary)" style={{ margin: '0 auto 1.5rem auto' }} />
                    <h2 style={{ fontSize: '2rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                        {module_header || "Graduation Exam"}
                    </h2>

                    {test_metadata && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Level</p>
                                <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>{test_metadata.level}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Questions</p>
                                <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>{test_metadata.total_questions}</p>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Topics Covered</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {test_metadata.topics_covered?.map((t, i) => (
                                        <span key={i} style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem' }}>
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <button className="btn btn-primary" onClick={handleStart} style={{ padding: '1rem 3rem', fontSize: '1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                        Start Exam <ChevronRight size={24} />
                    </button>
                </motion.div>
            </div>
        );
    }

    if (currentStep === 'result') {
        const passScore = parseInt(test_metadata?.passing_score?.split('/')[0]) || Math.ceil(test_content.length * 0.7);
        const passed = score >= passScore;

        return (
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-card"
                    style={{ padding: '4rem', background: passed ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(var(--bg-main-rgb), 1) 100%)' : 'var(--bg-card)' }}
                >
                    {passed ? (
                        <img src={simplishTalksLogo} alt="Passed" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem auto', objectFit: 'contain' }} />
                    ) : (
                        <RefreshCcw size={80} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem auto' }} />
                    )}
                    <h2 style={{ fontSize: '2.5rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        {passed 
                            ? (language === 'kn' ? `ಅಭಿನಂದನೆಗಳು, ${user?.fullName || ''}! ಪರೀಕ್ಷೆ ಮುಗಿದಿದೆ! 🎉` : `Congratulations, ${user?.fullName || ''}! Exam Passed! 🎉`) 
                            : 'Keep Practicing! 💪'}
                    </h2>
                    <p style={{ fontSize: '1.5rem', color: passed ? '#22c55e' : 'var(--text-muted)', marginBottom: '2rem', fontWeight: 700 }}>
                        Score: {score} / {test_content.length}
                    </p>

                    {graduation_retention_block && (
                        <div style={{ background: 'var(--bg-dark)', padding: '2rem', borderRadius: '1rem', marginBottom: '2rem', textAlign: 'left', border: '1px solid var(--border)' }}>
                            <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle2 size={20} /> The Final Mnemonic
                            </h4>
                            <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem' }}>
                                {graduation_retention_block.final_mnemonic}
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {language === 'kn' ? graduation_retention_block.encouragement_kannada : (graduation_retention_block.encouragement_english || graduation_retention_block.encouragement_kannada)}
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        {!passed && (
                            <button className="btn" onClick={handleStart} style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '1rem 2rem' }}>
                                Retake Exam
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={() => onComplete(passed ? 'next' : 'library')} style={{ padding: '1rem 2.5rem' }}>
                            {passed ? 'Continue Learning' : 'Back to Library'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // TEST STEP
    const currentQ = test_content[currentQuestionIndex];
    if (!currentQ) return null;

    const selectedLetter = answers[currentQuestionIndex];
    const correctLetter = answer_key[currentQ.question_number] || currentQ.correct_answer;
    const isCorrect = selectedLetter === correctLetter;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '1rem'
            }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    Question {currentQuestionIndex + 1} of {test_content.length}
                </span>
                <span style={{ color: 'var(--primary)', fontSize: '0.9rem', background: 'rgba(var(--primary-rgb), 0.1)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                    {currentQ.topic}
                </span>
            </div>

            <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="glass-card" style={{ padding: '2.5rem' }}
            >
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        {currentQ.question_english}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        {currentQ.question_kannada}
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    {currentQ.options?.map((opt, idx) => {
                        const optLetter = opt.replace(/^\//, '').substring(0, 1).toUpperCase(); // Clean typo like "/B)"
                        const isSelected = selectedLetter === optLetter;

                        let bg = 'var(--bg-dark)';
                        let border = '1px solid var(--border)';

                        if (showRationale) {
                            if (optLetter === correctLetter) {
                                bg = 'rgba(34, 197, 94, 0.1)';
                                border = '1px solid #22c55e';
                            } else if (isSelected && optLetter !== correctLetter) {
                                bg = 'rgba(239, 68, 68, 0.1)';
                                border = '1px solid #ef4444';
                            }
                        } else if (isSelected) {
                            border = '1px solid var(--primary)';
                            bg = 'rgba(var(--primary-rgb), 0.05)';
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswerSelect(opt.replace(/^\//, ''))}
                                disabled={showRationale}
                                style={{
                                    padding: '1.25rem', borderRadius: '1rem', textAlign: 'left',
                                    background: bg, border: border, color: 'var(--text-main)',
                                    fontSize: '1.1rem', cursor: showRationale ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative', overflow: 'hidden'
                                }}
                            >
                                {opt.replace(/^\//, '')}
                            </button>
                        );
                    })}
                </div>

                {showRationale ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        style={{ padding: '1.5rem', background: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '1rem', border: `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`, marginBottom: '1.5rem' }}
                    >
                        <h4 style={{ color: isCorrect ? '#22c55e' : '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isCorrect ? <CheckCircle2 size={20} /> : <Target size={20} />}
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                        </h4>
                        <p style={{ color: 'var(--text-main)', fontSize: '1.05rem', lineHeight: 1.5 }}>
                            {currentQ.rationale_kannada}
                        </p>
                    </motion.div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    {!showRationale ? (
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmitAnswer}
                            disabled={!selectedLetter}
                            style={{ padding: '0.75rem 2rem', opacity: !selectedLetter ? 0.5 : 1 }}
                        >
                            Check Answer
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={handleNextQuestion}
                            style={{ padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {currentQuestionIndex < test_content.length - 1 ? 'Next Question' : 'Finish Exam'} <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ExamInterface;
