import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, ChevronRight, RefreshCcw, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import simplishTalksLogo from '../../assets/logo_final.jpg';

const ExamInterface = ({ examData, lessonId, onComplete }) => {
    const [currentStep, setCurrentStep] = useState('intro'); // intro, test, result
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showRationale, setShowRationale] = useState(false);
    const [score, setScore] = useState(0);

    const { module_header, test_metadata, test_content = [], answer_key = {}, graduation_retention_block } = examData || {};

    const handleStart = () => {
        setCurrentStep('test');
        setCurrentQuestionIndex(0);
        setAnswers({});
        setScore(0);
        setShowRationale(false);
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
        setCurrentStep('result');

        const finalScore = Math.round((score / (test_content.length || 1)) * 100);

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
                        {passed ? 'Exam Passed! 🎉' : 'Keep Practicing! 💪'}
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
                                {graduation_retention_block.encouragement_kannada}
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
