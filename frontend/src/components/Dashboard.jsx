import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Loader2, CheckCircle2, Lock, Trophy } from 'lucide-react';
import { lessonApi, placementApi, reportApi } from '../utils/api';
import { useUser } from '../context/UserContext';

const Dashboard = ({ onStartLesson }) => {
    const { user, language } = useUser();
    const navigate = useNavigate();
    const getGrade = (score) => {
        if (score === null || score === undefined) return '-';
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        return 'D';
    };

    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
    const [adminStats, setAdminStats] = useState(null);
    const [expandedLevel, setExpandedLevel] = useState(null);

    const isAdmin = ['super_admin', 'admin', 'moderator'].includes(user?.role?.toLowerCase());

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                let lessonsData = [];
                let leaderboardData = [];
                let statsData = null;

                if (isAdmin) {
                    const [lessonsRes, leaderboardRes, statsRes] = await Promise.all([
                        lessonApi.getAll(),
                        placementApi.getLeaderboard(),
                        reportApi.getSummary()
                    ]);
                    lessonsData = Array.isArray(lessonsRes?.data) ? lessonsRes.data : (lessonsRes?.data?.lessons || []);
                    leaderboardData = leaderboardRes?.data || [];
                    statsData = statsRes?.data || null;
                } else {
                    const [lessonsRes, leaderboardRes] = await Promise.all([
                        lessonApi.getMyProgress(),
                        placementApi.getLeaderboard()
                    ]);
                    lessonsData = Array.isArray(lessonsRes?.data) ? lessonsRes.data : (lessonsRes?.data?.lessons || []);
                    leaderboardData = leaderboardRes?.data || [];
                }

                setLessons(lessonsData);
                setLeaderboard(leaderboardData);
                setAdminStats(statsData);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError("Failed to load dashboard data. Please check if the backend is running.");
            } finally {
                setLoading(false);
                setLoadingLeaderboard(false);
            }
        };
        fetchDashboardData();
    }, []);

    const levels = ["Basic", "Intermediate", "Advanced", "Expert"];

    // Sort lessons explicitly by curriculum Level, then unit_number, then display_order
    const sortedLessons = [...lessons].sort((a, b) => {
        const levelDiff = levels.indexOf(a.level) - levels.indexOf(b.level);
        if (levelDiff !== 0) return levelDiff;

        // 1. Final Graduation Exam always absolute last in the level
        const aIsFinal = !!a.content?.isFinal;
        const bIsFinal = !!b.content?.isFinal;
        if (aIsFinal && !bIsFinal) return 1;
        if (!aIsFinal && bIsFinal) return -1;

        // 2. Base on Unit Number first
        const unitA = Number(a.unit_number) || 0;
        const unitB = Number(b.unit_number) || 0;
        if (unitA !== unitB) return unitA - unitB;

        // 3. Within same unit, Module Exams always last
        const aIsExam = !!a.content?.isExam;
        const bIsExam = !!b.content?.isExam;
        if (aIsExam && !bIsExam) return 1;
        if (!aIsExam && bIsExam) return -1;

        // 4. Finally by display order
        const dispA = Number(a.display_order) || 0;
        const dispB = Number(b.display_order) || 0;
        return dispA - dispB;
    });

    // Find the lesson the user is currently working on or the next logical one
    const incompleteLesson =
        sortedLessons.find(l => (l.status === 'started' || l.progress > 0) && l.progress < 100) || // Partially complete
        sortedLessons.find(l => l.status !== 'completed'); // Next fully unstarted

    const isCourseCompleted = lessons.length > 0 && !incompleteLesson;

    const currentLesson = incompleteLesson || sortedLessons[sortedLessons.length - 1] || {
        title: language === 'kn' ? "ಯಾವುದೇ ಪಾಠಗಳು ಲಭ್ಯವಿಲ್ಲ" : "No lessons available yet",
        progress: 0,
        level: "N/A"
    };

    if (loading) {
        return (
            <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header omitted for brevity */}
            <header style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                    }}>
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                                {user?.fullName?.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>
                                {language === 'kn' ? `ನಮಸ್ಕಾರ, ${user?.fullName?.split(' ')[0]}!` : `Hello, ${user?.fullName?.split(' ')[0]}!`}
                            </h1>
                            <span style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '20px',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                PREMIUM
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            {language === 'kn' ? 'ಬನ್ನಿ, ಇಂಗ್ಲಿಷ್ ಕಲಿಯೋಣ.' : "Come, let's learn English."}
                        </p>
                    </div>
                </div>
            </header>

            {error && (
                <div style={{ color: '#dc2626', marginBottom: '2rem', padding: '1rem', border: '1px solid #fecaca', borderRadius: '0.5rem', background: '#fef2f2' }}>
                    {error}
                </div>
            )}

            <div className="dashboard-grid">
                <div className="left-column">
                    {isAdmin ? (
                        <section>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{language === 'kn' ? 'ವ್ಯಾಸಂಗದ ಒಟ್ಟಾರೆ ಮಾಹಿತಿ' : 'Curriculum Overview'}</span>
                            </h3>
                            <div style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', display: 'grid', gap: '1.5rem' }}>
                                {levels.map((lvl) => {
                                    const lessonsInLevel = lessons.filter(l => l.level === lvl).length;
                                    return (
                                        <motion.div
                                            key={lvl}
                                            className="glass-card"
                                            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
                                        >
                                            <h4 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{lvl} English</span>
                                            </h4>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>{language === 'kn' ? 'ಒಟ್ಟು ಪಾಠಗಳು' : 'Total Lessons'}</span>
                                                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>{lessonsInLevel}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>
                    ) : (
                        <>
                            {/* Pick up where you left off */}
                            <section style={{ marginBottom: '2.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>
                                        {isCourseCompleted 
                                            ? (language === 'kn' ? '🎉 ಅಭಿನಂದನೆಗಳು!' : '🎉 Congratulations!') 
                                            : (language === 'kn' ? 'ಮುಂದುವರಿಸಿ' : 'Continue')}
                                    </span>
                                </h3>
                                <motion.div
                                    className="glass-card"
                                    style={{
                                        padding: '1.5rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: isCourseCompleted ? 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)' : 'var(--bg-card)',
                                        border: isCourseCompleted ? '2px solid var(--primary)' : '1px solid var(--border)'
                                    }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div style={{ flex: 1 }}>
                                        {isCourseCompleted ? (
                                            <>
                                                <h2 style={{ margin: 0, color: 'var(--text-main)' }}>
                                                    {language === 'kn' ? 'ನೀವು ಎಲ್ಲಾ ಪಾಠಗಳನ್ನು ಮುಗಿಸಿದ್ದೀರಿ!' : "You've finished all lessons!"}
                                                </h2>
                                                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                                    {language === 'kn' ? 'ನೀವು ಇಡೀ ಕೋರ್ಸ್ ಅನ್ನು ಕಲಿತಿದ್ದೀರಿ. ಅಭ್ಯಾಸ ಮುಂದುವರಿಸಿ!' : "You've mastered the entire course. Keep practicing to stay sharp!"}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                {!currentLesson.content?.isFinal && (
                                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentLesson.level} English</span>
                                                )}
                                                <h2 style={{ margin: '0.5rem 0', fontSize: '1.25rem' }}>{currentLesson.title}</h2>
                                                <div style={{ maxWidth: '450px', marginTop: '1.5rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                                        <span style={{ color: 'var(--text-main)' }}>{language === 'kn' ? 'ಪ್ರಗತಿ' : 'Progress'}</span>
                                                        <span style={{ color: 'var(--primary)' }}>{currentLesson.progress || 0}%</span>
                                                    </div>
                                                    <div className="progress-bar" style={{ height: '10px', background: 'rgba(var(--primary-rgb), 0.1)' }}>
                                                        <motion.div
                                                            className="progress-fill"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${currentLesson.progress || 0}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            style={{ boxShadow: '0 0 12px rgba(var(--primary-rgb), 0.4)' }}
                                                        ></motion.div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '1rem 2rem',
                                            fontSize: '1rem',
                                            boxShadow: '0 10px 15px -3px rgba(var(--primary-rgb), 0.3)'
                                        }}
                                        disabled={!lessons.length && !isCourseCompleted}
                                        onClick={() => {
                                            if (isCourseCompleted) {
                                                navigate('/library');
                                            } else {
                                                onStartLesson && onStartLesson(currentLesson);
                                            }
                                        }}
                                    >
                                        {isCourseCompleted ? (
                                            <><span>{language === 'kn' ? 'ಲೈಬ್ರರಿ ನೋಡಿ' : 'View Library'}</span></>
                                        ) : (
                                            <>
                                                <Play size={20} fill="currentColor" />
                                                <span>{language === 'kn' ? 'ಪ್ರಾರಂಭಿಸಿ' : 'Start'}</span>
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            </section>

                            {/* Learning Path */}
                            <section>
                                <h3 style={{ marginBottom: '1.5rem' }}>
                                    {language === 'kn' ? 'ನಿಮ್ಮ ಕಲಿಕೆಯ ಹಾದಿ' : 'Your Learning Path'}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {levels.map((lvl, index) => {
                                        const lessonsInLevel = lessons.filter(l => l.level === lvl);

                                        // Robust locking: Module is locked if any lesson in any previous level is incomplete
                                        // Robust locking: Module is locked if any lesson in any previous level is incomplete
                                        const prevLevels = levels.slice(0, index);
                                        const lessonsInPrevLevels = lessons.filter(l => prevLevels.includes(l.level));
                                        const isLocked = !isAdmin && index > 0 && (lessonsInPrevLevels.length === 0 || lessonsInPrevLevels.some(l => (l.progress || 0) < 100));

                                        const isExpanded = expandedLevel === lvl;

                                        // --- MODULE GROUPING LOGIC ---
                                        const modules = [];
                                        const moduleMap = new Map();

                                        lessonsInLevel.sort((a,b) => (a.unit_number||0) - (b.unit_number||0) || (a.display_order||0) - (b.display_order||0)).forEach(l => {
                                            const mTitle = l.module_title || 'General';
                                            if (!moduleMap.has(mTitle)) {
                                                const mObj = { title: mTitle, lessons: [], unit: l.unit_number || 0 };
                                                moduleMap.set(mTitle, mObj);
                                                modules.push(mObj);
                                            }
                                            moduleMap.get(mTitle).lessons.push(l);
                                        });
                                        // Sort modules by unit number
                                        modules.sort((a,b) => a.unit - b.unit);

                                        return (
                                            <motion.div
                                                key={lvl}
                                                className="glass-card"
                                                style={{
                                                    padding: '1.5rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    opacity: isLocked ? 0.6 : 1,
                                                    filter: isLocked ? 'grayscale(30%)' : 'none'
                                                }}
                                                whileHover={!isLocked ? { scale: 1.01, borderColor: 'var(--primary)' } : {}}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                        {language === 'kn' ? `ಹಂತ ${index + 1}` : `MODULE ${index + 1}`}
                                                    </span>
                                                    {isLocked && <span style={{ fontSize: '1.2rem' }}>🔒</span>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                                    <h4 style={{ margin: 0 }}>{lvl} English</h4>
                                                    {(() => {
                                                        const exam = lessonsInLevel.find(l => l.content?.isExam || l.title?.toLowerCase().includes('graduation'));
                                                        const isModuleCompleted = exam && exam.progress === 100;
                                                        if (isModuleCompleted) {
                                                            return (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span style={{
                                                                        background: '#16a34a', color: 'white', padding: '0.1rem 0.5rem',
                                                                        borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                                                                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                                                                    }}>
                                                                        <CheckCircle2 size={10} /> {language === 'kn' ? 'ಪೂರ್ಣಗೊಂಡಿದೆ' : 'COMPLETED'}
                                                                    </span>
                                                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                                        {exam.score}% ({getGrade(exam.score)})
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', flex: 1 }}>
                                                    {lessonsInLevel.length > 0
                                                        ? (language === 'kn' 
                                                            ? `ಈ ಹಂತದಲ್ಲಿರುವ ${lessonsInLevel.length} ಪಾಠಗಳನ್ನು ಕಲಿಯಿರಿ.` 
                                                            : `Explore ${lessonsInLevel.length} active lessons in this module.`)
                                                        : (language === 'kn'
                                                            ? `${lvl} ಇಂಗ್ಲಿಷ್ ವ್ಯಾಕರಣ ಮತ್ತು ಮಾತನಾಡುವ ಕಲೆಯನ್ನು ಕಲಿಯಿರಿ.`
                                                            : `Master the ${lvl.toLowerCase()} levels of spoken English and grammar.`)}
                                                </p>

                                                {/* Module Progress & Score */}
                                                {lessonsInLevel.length > 0 && !isLocked && (
                                                    <div style={{ marginBottom: '1rem' }}>
                                                        {(() => {
                                                            const totalProg = lessonsInLevel.reduce((acc, l) => acc + (l.progress || 0), 0);
                                                            const avgProg = Math.round(totalProg / lessonsInLevel.length);

                                                            const scoredLessons = lessonsInLevel.filter(l => l.score !== null);
                                                            const totalScore = scoredLessons.reduce((acc, l) => acc + l.score, 0);
                                                            const avgScore = scoredLessons.length > 0 ? Math.round(totalScore / scoredLessons.length) : null;

                                                            return (
                                                                <div style={{ fontSize: '0.8rem' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                        <span>{language === 'kn' ? 'ಹಂತದ ಪ್ರಗತಿ:' : 'Module Completion:'}</span>
                                                                        <span style={{ fontWeight: 'bold' }}>{avgProg}%</span>
                                                                    </div>
                                                                    <div className="progress-bar" style={{ height: '6px', marginBottom: '8px' }}>
                                                                        <div className="progress-fill" style={{ width: `${avgProg}%` }}></div>
                                                                    </div>
                                                                    {avgScore !== null && (
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 'bold' }}>
                                                                            <span>{language === 'kn' ? 'ಮೌಲ್ಯಮಾಪನ ಅಂಕಗಳು:' : 'Assessment Score:'}</span>
                                                                            <span>{avgScore}%</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                                    <span style={{ fontSize: '0.8rem' }}>{lessonsInLevel.length} {language === 'kn' ? 'ಪಾಠಗಳು' : 'Lessons'}</span>
                                                    <button
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: isLocked ? 'var(--text-muted)' : 'var(--primary)',
                                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 'bold'
                                                        }}
                                                        disabled={isLocked}
                                                        onClick={() => setExpandedLevel(isExpanded ? null : lvl)}
                                                    >
                                                        {isExpanded 
                                                            ? (language === 'kn' ? 'ಮುಚ್ಚಿ ↑' : 'Close ↑') 
                                                            : (language === 'kn' ? 'ನೋಡಿ →' : 'View →')}
                                                    </button>
                                                </div>

                                                {/* Expandable Lesson View */}
                                                {isExpanded && !isLocked && (
                                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                                        {modules.length === 0 ? (
                                                            <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                                                {language === 'kn' ? 'ಇನ್ನೂ ಯಾವುದೇ ಪಾಠಗಳು ಲಭ್ಯವಿಲ್ಲ.' : 'No lessons available yet.'}
                                                            </p>
                                                        ) : (
                                                            modules.map((m, mIdx) => (
                                                                <div key={mIdx}>
                                                                    {m.title.toLowerCase() !== 'general' && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                                                            <h5 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                {m.title}
                                                                            </h5>
                                                                        </div>
                                                                    )}
                                                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                        {m.lessons.map(l => {
                                                                            const globalIdx = sortedLessons.findIndex(sl => sl.id === l.id);
                                                                            const prevLesson = globalIdx > 0 ? sortedLessons[globalIdx - 1] : null;
                                                                            const isPrereqLocked = !isAdmin && prevLesson && (prevLesson.progress || 0) < 100;
                                                                            const isExam = l.content?.isExam;
                                                                            
                                                                            return (
                                                                                <li 
                                                                                    key={l.id} 
                                                                                    style={{ 
                                                                                        display: 'flex', 
                                                                                        justifyContent: 'space-between', 
                                                                                        alignItems: 'center', 
                                                                                        fontSize: '0.85rem', 
                                                                                        padding: '0.75rem', 
                                                                                        background: isPrereqLocked ? 'rgba(0,0,0,0.01)' : (isExam ? 'rgba(245, 158, 11, 0.05)' : 'rgba(var(--primary-rgb), 0.03)'), 
                                                                                        borderRadius: '12px',
                                                                                        border: isPrereqLocked ? '1px solid transparent' : (isExam ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(var(--primary-rgb), 0.1)'),
                                                                                        opacity: isPrereqLocked ? 0.6 : 1,
                                                                                        cursor: isPrereqLocked ? 'not-allowed' : 'pointer',
                                                                                        transition: 'all 0.2s ease',
                                                                                        minHeight: '56px'
                                                                                    }}
                                                                                    onClick={() => {
                                                                                        if (isPrereqLocked) return;
                                                                                        onStartLesson && onStartLesson(l);
                                                                                    }}
                                                                                >
                                                                                    <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }} title={l.title}>
                                                                                        {isPrereqLocked ? <Lock size={14} color="var(--text-muted)" /> : (l.progress === 100 ? <CheckCircle2 size={14} color="#16a34a" /> : (isExam ? <Trophy size={14} color="#f59e0b" /> : <Play size={14} color="var(--primary)" />))}
                                                                                        <span style={{ fontWeight: isExam ? 800 : 500 }}>{l.title}</span>
                                                                                        {l.score !== null && (
                                                                                            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                                                                                                [{l.score}%]
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <span style={{
                                                                                        fontWeight: 'bold',
                                                                                        color: isPrereqLocked ? 'var(--text-muted)' : (l.progress === 100 ? '#10b981' : (isExam ? '#f59e0b' : 'var(--text-main)')),
                                                                                        flexShrink: 0,
                                                                                        fontSize: '0.7rem',
                                                                                        padding: '0.25rem 0.5rem',
                                                                                        background: isPrereqLocked ? 'rgba(0,0,0,0.05)' : (l.progress === 100 ? 'rgba(16, 185, 129, 0.1)' : 'transparent'),
                                                                                        borderRadius: '6px',
                                                                                        textTransform: 'uppercase',
                                                                                        letterSpacing: '0.02em'
                                                                                    }}>
                                                                                        {isPrereqLocked 
                                                                                            ? (language === 'kn' ? 'ಲಾಕ್ ಆಗಿದೆ' : 'Locked') 
                                                                                            : (l.progress === 100 
                                                                                                ? (language === 'kn' ? 'ಪೂರ್ಣಗೊಂಡಿದೆ' : 'Completed') 
                                                                                                : (isExam ? (language === 'kn' ? 'ಪರೀಕ್ಷೆ' : 'MODULE EXAM') : `${l.progress || 0}%`))}
                                                                                    </span>
                                                                                </li>
                                                                            );
                                                                        })}
                                                                    </ul>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>
                            
                            {/* --- FINAL GRADUATION EXAM SECTION --- */}
                            <section style={{ marginTop: '2.5rem', paddingBottom: '2.5rem' }}>
                                <div className="glass-card" style={{ 
                                    padding: '2rem', 
                                    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(var(--primary-rgb), 0.05) 100%)',
                                    border: '2px solid var(--primary)',
                                    borderRadius: '24px',
                                    textAlign: 'center',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}>
                                        <Trophy size={200} />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                                        {language === 'kn' ? 'ಪಠ್ಯಕ್ರಮದ ಪದವಿ' : 'Curriculum Graduation'}
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2.5rem auto', fontSize: '1.1rem' }}>
                                        {language === 'kn' 
                                            ? 'ನೀವು ಎಲ್ಲಾ ಹಂತಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಳಿಸಿದ ನಂತರ ಅಂತಿಮ ಪರೀಕ್ಷೆಯನ್ನು ಇಲ್ಲಿ ತೆಗೆದುಕೊಳ್ಳಬಹುದು.' 
                                            : 'Once you successfully complete all levels, you can challenge the Final Graduation Exam here.'}
                                    </p>

                                    {(() => {
                                        const finalExam = lessons.find(l => l.content?.isFinal);
                                        const allOtherComplete = lessons.filter(l => !l.content?.isFinal).every(l => l.progress === 100);
                                        const finalLocked = !isAdmin && (!allOtherComplete || !finalExam);

                                        if (isAdmin && !finalExam) {
                                            return (
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={() => navigate('/library')}
                                                    style={{ padding: '1rem 3rem', fontSize: '1.1rem', background: '#f59e0b', border: 'none' }}
                                                >
                                                    {language === 'kn' ? 'ಅಂತಿಮ ಪರೀಕ್ಷೆಯನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ' : 'Upload Final Graduation Exam'}
                                                </button>
                                            );
                                        }

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                <button 
                                                    disabled={finalLocked}
                                                    onClick={() => finalExam && onStartLesson(finalExam)}
                                                    className="btn btn-primary" 
                                                    style={{ 
                                                        padding: '1.25rem 4rem', 
                                                        fontSize: '1.2rem', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '1rem',
                                                        opacity: finalLocked ? 0.5 : 1,
                                                        background: finalLocked ? 'var(--bg-card)' : 'var(--primary)',
                                                        color: finalLocked ? 'var(--text-muted)' : 'white'
                                                    }}
                                                >
                                                    {finalLocked ? <Lock size={24} /> : <Trophy size={24} />}
                                                    {language === 'kn' ? 'ಅಂತಿಮ ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ' : 'Take Final Exam'}
                                                </button>
                                                {finalLocked && !allOtherComplete && (
                                                    <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
                                                        {language === 'kn' ? 'ಈ ಹಂತ ತಲುಪಲು ಮೊದಲಿನ ಎಲ್ಲಾ ಹಂತ ಮುಕ್ತಾಯಗೊಳಿಸಿ' : 'Complete all previous lessons to unlock graduation'}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </section>
                        </>
                    )}
                </div>

                {/* Right Column: Leaderboard */}
                <div className="right-column">
                    <section>
                        <h3 style={{ marginBottom: '1.5rem' }}>
                            {language === 'kn' ? 'ಲೀಡರ್‌ಬೋರ್ಡ್' : 'Leaderboard'}
                        </h3>
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            {loadingLeaderboard ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                                    {language === 'kn' ? 'ಯಾವುದೇ ಅಂಕಗಳಿಲ್ಲ.' : 'No scores yet.'}
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {leaderboard.map((entry, idx) => (
                                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.75rem', borderBottom: idx !== leaderboard.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '50%',
                                                background: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#fff7ed' : 'var(--bg-dark)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid var(--border)',
                                                overflow: 'hidden'
                                            }}>
                                                {entry.avatarUrl ? (
                                                    <img src={entry.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    idx + 1
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{entry.userName}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(entry.date).toLocaleDateString()}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>{entry.score}%</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{entry.level}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
