import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, 
    Music, 
    Video, 
    ArrowRight, 
    Loader2, 
    Search, 
    Edit, 
    Trash2, 
    Plus, 
    Image, 
    Trophy, 
    RefreshCw, 
    Lock,
    Zap,
    Clock,
    CheckCircle2,
    Play
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { lessonApi } from '../utils/api';
import { useToast } from './Toast';
import { useUser } from '../context/UserContext';

const Library = ({ onSelectLesson, onEditLesson, onAddLesson, onAddExam }) => {
    const { user, language } = useUser();
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [expandedModules, setExpandedModules] = useState(['Basic']);
    const showToast = useToast();
    const navigate = useNavigate();

    const isMod = ['super_admin', 'admin', 'moderator'].includes(user?.role?.toLowerCase());
    const isPaid = user?.is_paid || isMod;
    const levels = ["Basic", "Intermediate", "Advanced", "Expert"];

    const fetchLessons = async () => {
        try {
            const response = isMod ? await lessonApi.getAll() : await lessonApi.getMyProgress();
            const data = Array.isArray(response.data) ? response.data : (response.data.lessons || []);
            setLessons(data);
        } catch (err) {
            console.error("Error fetching library:", err);
            showToast('ಲೈಬ್ರರಿ ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ (Failed to load library)', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        setConfirmDeleteId(id);
    };

    const confirmDelete = async () => {
        const id = confirmDeleteId;
        setConfirmDeleteId(null);
        try {
            await lessonApi.delete(id);
            setLessons(lessons.filter(l => l.id !== id));
            showToast('Lesson deleted successfully.', 'success');
        } catch (err) {
            showToast('Failed to delete lesson.', 'error');
        }
    };

    const filteredLessons = lessons.filter(lesson =>
        lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'pdf': return <FileText size={20} />;
            case 'audio': return <Music size={20} />;
            case 'video': return <Video size={20} />;
            case 'image': return <Image size={20} />;
            default: return <FileText size={20} />;
        }
    };

    // ── Sorting & Paywall Logic ──
    const extractLessonNumber = (title) => {
        const match = title.match(/(?:Lesson|ಪಾಠ)\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
    };

    const lessonSortFn = (a, b) => {
        // 1. Level priority first (Basic → Intermediate → etc.)
        const levelCodeA = levels.indexOf(a.level);
        const levelCodeB = levels.indexOf(b.level);
        if (levelCodeA !== levelCodeB) return levelCodeA - levelCodeB;

        // 2. Global Final Graduation Exam absolute last
        const aIsFinal = !!a.content?.isFinal;
        const bIsFinal = !!b.content?.isFinal;
        if (aIsFinal && !bIsFinal) return 1;
        if (!aIsFinal && bIsFinal) return -1;

        // 3. Lesson Number Priority
        const numA = extractLessonNumber(a.title);
        const numB = extractLessonNumber(b.title);

        // Within a level, numbered lessons MUST come before non-numbered assessments
        // Numbered lessons have num > 0, Graduation tests/exams have num = 0
        if (numA > 0 && numB === 0) return -1; // numA first
        if (numA === 0 && numB > 0) return 1;  // numB first

        // If both have numbers, sort numerically
        if (numA > 0 && numB > 0) {
            if (numA !== numB) return numA - numB;
        }

        // 4. Units (Secondary)
        const unitA = Number(a.unit_number) || 0;
        const unitB = Number(b.unit_number) || 0;
        if (unitA !== unitB) return unitA - unitB;

        // 5. Exam status within Level/Module
        const aIsExam = !!a.content?.isExam;
        const bIsExam = !!b.content?.isExam;
        if (aIsExam && !bIsExam) return 1;
        if (!aIsExam && bIsExam) return -1;

        // 6. Manual display order
        return (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
    };

    const basicLessonsSorted = [...lessons]
        .filter(l => l.level === 'Basic')
        .sort(lessonSortFn);

    const freeLessonIds = basicLessonsSorted.slice(0, 2).map(l => l.id);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div className="library-container" style={{ padding: '0 0.5rem' }}>
            {/* Confirm Delete Dialog */}
            {confirmDeleteId && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '1rem' }}>{language === 'kn' ? 'ಪಾಠವನ್ನು ಅಳಿಸುವುದೇ?' : 'Delete Lesson?'}</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1rem' }}>
                            {language === 'kn' ? 'ಈ ಪಾಠವನ್ನು ಶಾಶ್ವತವಾಗಿ ತೆಗೆದುಹಾಕುವುದೇ? ಇದನ್ನು ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.' : 'Permanently remove this lesson? This cannot be undone.'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn" onClick={() => setConfirmDeleteId(null)} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', flex: 1 }}>{language === 'kn' ? 'ರದ್ದುಮಾಡಿ' : 'Cancel'}</button>
                            <button className="btn" onClick={confirmDelete} style={{ background: '#ef4444', color: '#fff', flex: 1 }}>{language === 'kn' ? 'ಅಳಿಸಿ' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}

            <header style={{ 
                marginBottom: '2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '1rem',
                padding: window.innerWidth < 640 ? '0 0.5rem' : '0'
            }}>
                <div style={{ flex: '1 1 300px' }}>
                    <h1 style={{ fontSize: window.innerWidth < 640 ? '1.75rem' : '2.2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                        {language === 'kn' ? 'ನನ್ನ ಲೈಬ್ರರಿ' : 'My Library'}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: window.innerWidth < 640 ? '0.95rem' : '1.1rem' }}>
                        {language === 'kn' ? 'ನಿಮ್ಮ ಕಲಿಕೆಯ ಪಠ್ಯಕ್ರಮವನ್ನು ಇಲ್ಲಿ ನೋಡಿ.' : 'Explore your structured learning curriculum.'}
                    </p>
                </div>
                {isMod && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button onClick={onAddExam} className="btn" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid #eab308', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <Trophy size={16} /> {language === 'kn' ? 'ಪರೀಕ್ಷೆ ಸೇರಿಸಿ' : 'Add Exam'}
                        </button>
                        <button onClick={onAddLesson} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <Plus size={16} /> {language === 'kn' ? 'ಹೊಸ ಪಾಠ' : 'Add Lesson'}
                        </button>
                    </div>
                )}
            </header>

            <div className="glass-card" style={{ padding: '0.75rem 1.5rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border)' }}>
                <Search size={22} color="var(--text-muted)" />
                <input
                    type="text"
                    placeholder={language === 'kn' ? 'ಪಾಠಗಳನ್ನು ಹುಡುಕಿ...' : "Search lessons..."}
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', outline: 'none', width: '100%', fontSize: '1.1rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* 👑 Free Trial Banner */}
            {!isPaid && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '20px',
                        padding: window.innerWidth < 640 ? '1.25rem' : '1.5rem 2rem',
                        marginBottom: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1.5rem',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)', zIndex: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', zIndex: 1 }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Zap size={28} fill="currentColor" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>
                                {language === 'kn' ? 'ನೋಂದಾಯಿತ ಬಳಕೆದಾರರಿಗೆ ಸೀಮಿತ ಪ್ರವೇಶ' : 'Limited Access'}
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                {language === 'kn' 
                                    ? `ನೀವು 2-ಪಾಠಗಳ ಉಚಿತ ಪ್ರಯೋಗದಲ್ಲಿದ್ದೀರಿ. ಎಲ್ಲಾ ${lessons.length} ಪಾಠಗಳನ್ನು ಪಡೆಯಲು ಪ್ರೀಮಿಯಂಗೆ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ.` 
                                    : `You're on a 2-lesson trial. Upgrade to unlock all ${lessons.length} lessons.`}
                            </p>
                        </div>
                    </div>
                        <button
                        onClick={() => navigate('/payment')}
                        className="btn"
                        style={{ background: '#3b82f6', color: 'white', padding: '0.8rem 2rem', fontWeight: 800, borderRadius: '12px', border: 'none', zIndex: 1, boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)', pointerEvents: 'auto' }}
                    >
                        {language === 'kn' ? 'ಪ್ರೀಮಿಯಂ ಪಡೆಯಿರಿ' : 'Activate Premium Now'}
                    </button>
                </motion.div>
            )}

            {filteredLessons.length === 0 ? (
                <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>{language === 'kn' ? 'ಯಾವುದೇ ಪಾಠಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' : 'No lessons found.'}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {levels.map((lvl, levelIndex) => {
                        const lessonsInLevel = filteredLessons.filter(l => l.level === lvl && !l.content?.isFinal);
                        if (lessonsInLevel.length === 0 && searchQuery) return null;

                        const isLevelExpanded = expandedModules.includes(lvl);
                        const toggleLevel = () => {
                            setExpandedModules(prev =>
                                prev.includes(lvl) ? prev.filter(m => m !== lvl) : [...prev, lvl]
                            );
                        };

                        // Sort all lessons in this level to establish correct pruning/hierarchy
                        const sortedLevelLessons = [...lessonsInLevel].sort(lessonSortFn);

                        // Group into Modules based on the sorted sequence
                        const modules = [];
                        const moduleMap = new Map();
                        
                        sortedLevelLessons.forEach(l => {
                            const modTitle = l.module_title || 'General';
                            if (!moduleMap.has(modTitle)) {
                                const mObj = { title: modTitle, unit: l.unit_number || 1, lessons: [] };
                                moduleMap.set(modTitle, mObj);
                                modules.push(mObj);
                            }
                            moduleMap.get(modTitle).lessons.push(l);
                        });
                        const sortedModules = modules; // Already ordered by inclusion sequence from sortedLevelLessons

                        // Find the index of each lesson in the global sorted list to check the overall curriculum prerequisite
                        const allSortedLessons = [...lessons].sort(lessonSortFn);

                        return (
                            <div key={lvl} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Level Header */}
                                <div
                                    className="glass-card"
                                    onClick={toggleLevel}
                                    style={{
                                        padding: window.innerWidth < 640 ? '1rem 1.25rem' : '1.5rem 2rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        background: isLevelExpanded ? 'linear-gradient(90deg, var(--bg-dark) 0%, rgba(255,255,255,0.02) 100%)' : 'rgba(255,255,255,0.02)',
                                        borderLeft: isLevelExpanded ? '6px solid var(--primary)' : '1px solid var(--border)',
                                        borderRadius: '1rem'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                                            {language === 'kn' ? `ಹಂತ ${levelIndex + 1}` : `LEVEL ${levelIndex + 1}`}
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: isLevelExpanded ? 'var(--primary)' : 'var(--text-main)' }}>{lvl} English</h2>
                                    </div>
                                    <ArrowRight size={24} style={{ transform: isLevelExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: 'var(--text-muted)' }} />
                                </div>

                                {isLevelExpanded && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>
                                        {sortedModules.map(module => (
                                            <div key={module.title} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                {module.title.toLowerCase() !== 'general' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 0.5rem' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900 }}>{module.unit}</div>
                                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', opacity: 0.9 }}>{module.title}</h3>
                                                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--border) 0%, transparent 100%)' }} />
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {module.lessons.sort(lessonSortFn).map((lesson, idx) => {
                                                        const globalIdx = allSortedLessons.findIndex(l => l.id === lesson.id);
                                                        const prevLesson = globalIdx > 0 ? allSortedLessons[globalIdx - 1] : null;
                                                        const isPrereqLocked = !isMod && prevLesson && (prevLesson.progress || 0) < 100;
                                                        const isPaywallLocked = !isPaid && !freeLessonIds.includes(lesson.id);
                                                        const isLocked = isPaywallLocked || isPrereqLocked;

                                                        return (
                                                            <motion.div
                                                                key={lesson.id}
                                                                className="glass-card"
                                                                style={{
                                                                    padding: '0.75rem',
                                                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                                                    position: 'relative',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '0.75rem',
                                                                    opacity: isLocked ? 0.7 : 1,
                                                                    filter: isLocked ? 'grayscale(0.6)' : 'none',
                                                                    border: isLocked ? '1px solid var(--border)' : '1px solid var(--primary-light)',
                                                                    transform: isLocked ? 'none' : 'translateY(0)',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                                whileHover={!isLocked ? { translateY: -4, borderColor: 'var(--primary)', boxShadow: '0 12px 24px rgba(var(--primary-rgb), 0.15)' } : {}}
                                                                onClick={() => {
                                                                    if (isPaywallLocked) { navigate('/payment'); return; }
                                                                    if (isPrereqLocked) { 
                                                                        showToast(`ದಯವಿಟ್ಟು ಮೊದಲು ಹಿಂದಿನ ಪಾಠವನ್ನು ಮುಗಿಸಿ: "${prevLesson.title}" (Please finish the previous lesson first)`, 'info');
                                                                        return; 
                                                                    }
                                                                    onSelectLesson(lesson);
                                                                }}
                                                            >
                                                                {isLocked && (
                                                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: isPaywallLocked ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: isPaywallLocked ? '#3b82f6' : 'var(--text-muted)', padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 10 }}>
                                                                        <Lock size={14} /> {isPaywallLocked ? 'PREMIUM' : (language === 'kn' ? 'ಲಾಕ್ ಆಗಿದೆ' : 'LOCKED')}
                                                                    </div>
                                                                )}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                        <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: lesson.content?.isExam ? 'rgba(234, 179, 8, 0.1)' : 'var(--primary-light)', color: lesson.content?.isExam ? '#eab308' : 'var(--primary)' }}>
                                                                            {lesson.content?.isExam ? <Trophy size={16} /> : getIcon(lesson.media_type)}
                                                                        </div>
                                                                        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>{lesson.title}</h3>
                                                                    </div>
                                                                    {isMod && (
                                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                            <button onClick={(e) => { e.stopPropagation(); onEditLesson(lesson); }} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.4rem', borderRadius: '8px' }}><Edit size={14} /></button>
                                                                            <button onClick={(e) => handleDelete(e, lesson.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.4rem', borderRadius: '8px' }}><Trash2 size={14} /></button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div style={{ 
                                                                    display: 'grid', 
                                                                    gridTemplateColumns: window.innerWidth < 450 ? '1fr' : 'repeat(auto-fit, minmax(80px, 1fr))', 
                                                                    gap: '0.75rem', 
                                                                    background: 'rgba(0,0,0,0.1)', 
                                                                    padding: '0.75rem 1rem', 
                                                                    borderRadius: '12px' 
                                                                }}>
                                                                    {!lesson.content?.isFinal && (
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'kn' ? 'ಹಂತ' : 'Level'}</span>
                                                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{lesson.level}</span>
                                                                        </div>
                                                                    )}
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'kn' ? 'ಮುಗಿದಿದೆ' : 'Done'}</span>
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: lesson.progress === 100 ? '#10b981' : 'var(--text-muted)' }}>
                                                                            {lesson.progress === 100 ? (language === 'kn' ? 'ಹೌದು' : 'Yes') : (language === 'kn' ? 'ಇಲ್ಲ' : 'No')}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{language === 'kn' ? 'ಅಂಕಗಳು' : 'Score'}</span>
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: lesson.score >= 80 ? '#10b981' : (lesson.score ? 'var(--primary)' : 'var(--text-muted)') }}>{lesson.score ? `${lesson.score}%` : '---'}</span>
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {lesson.estimated_time || '15'}m</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                        {lesson.progress === 100 && (
                                                                            <button 
                                                                                onClick={(e)=>{e.stopPropagation(); onSelectLesson(lesson);}} 
                                                                                className="btn revise-btn"
                                                                                style={{ padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, height: 'auto', minHeight: 'auto' }}
                                                                            >
                                                                                <RefreshCw size={12} style={{marginRight:'0.3rem'}}/> {language === 'kn' ? 'ಮತ್ತೆ ಕಲಿಯಿರಿ' : 'Revise'}
                                                                            </button>
                                                                        )}
                                                                        <button 
                                                                            style={{ 
                                                                                background: isLocked ? 'var(--bg-dark)' : 'var(--primary)', 
                                                                                color: isLocked ? 'var(--text-muted)' : 'white', 
                                                                                border: 'none', 
                                                                                padding: '0.4rem 1.25rem', 
                                                                                borderRadius: '8px', 
                                                                                fontSize: '0.75rem', 
                                                                                fontWeight: 800, 
                                                                                display: 'flex', 
                                                                                alignItems: 'center', 
                                                                                gap: '0.3rem',
                                                                                cursor: isLocked ? 'not-allowed' : 'pointer'
                                                                            }}
                                                                            disabled={isLocked}
                                                                        >
                                                                            {lesson.progress === 100 
                                                                                ? (language === 'kn' ? 'ನೋಡಿ' : 'Review') 
                                                                                : (language === 'kn' ? 'ಪ್ರಾರಂಭಿಸಿ' : 'Start')} <ArrowRight size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* 🎓 Independence Graduation Exam Section */}
                    {filteredLessons.filter(l => !!l.content?.isFinal).length > 0 && (
                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 0.5rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                                    <Trophy size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#eab308' }}>
                                    {language === 'kn' ? 'ಪದವಿ ಪ್ರಧಾನ ಹಂತ' : 'Graduation Milestone'}
                                </h3>
                                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.3) 0%, transparent 100%)' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {filteredLessons.filter(l => !!l.content?.isFinal).sort(lessonSortFn).map((lesson) => {
                                    const allSortedLessons = [...lessons].sort(lessonSortFn);
                                    const globalIdx = allSortedLessons.findIndex(l => l.id === lesson.id);
                                    const prevLesson = globalIdx > 0 ? allSortedLessons[globalIdx - 1] : null;
                                    const isPrereqLocked = !isMod && prevLesson && (prevLesson.progress || 0) < 100;
                                    const isPaywallLocked = !isPaid; // Always paid for graduation
                                    const isLocked = isPaywallLocked || isPrereqLocked;

                                    return (
                                        <motion.div
                                            key={lesson.id}
                                            className="glass-card"
                                            style={{
                                                padding: '1.5rem',
                                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem',
                                                opacity: isLocked ? 0.8 : 1,
                                                borderColor: !isLocked ? '#eab308' : 'var(--border)',
                                                background: !isLocked ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, transparent 100%)' : 'rgba(255,255,255,0.02)',
                                                borderWidth: !isLocked ? '2px' : '1px',
                                                boxShadow: !isLocked ? '0 10px 30px rgba(234, 179, 8, 0.1)' : 'none'
                                            }}
                                            whileHover={!isLocked ? { scale: 1.01, boxShadow: '0 15px 40px rgba(234, 179, 8, 0.2)' } : {}}
                                            onClick={() => {
                                                if (isPaywallLocked) { navigate('/payment'); return; }
                                                if (isPrereqLocked) { 
                                                    showToast(`ದಯವಿಟ್ಟು ಮೊದಲು ಹಿಂದಿನ ಪಾಠವನ್ನು ಮುಗಿಸಿ: "${prevLesson.title}" (Please finish the previous lesson first)`, 'info');
                                                    return; 
                                                }
                                                onSelectLesson(lesson);
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                                                        <Trophy size={28} />
                                                    </div>
                                                    <div>
                                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{lesson.title}</h2>
                                                        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                                                            {language === 'kn' ? 'ನಿಮ್ಮ ಕಲಿಕೆಯ ಪೂರ್ಣತೆಯ ಅಂತಿಮ ಪರೀಕ್ಷೆ' : 'The final step to mastering Simplish English.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isLocked && (
                                                    <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.5rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 800 }}>
                                                        <Lock size={14} /> {isPaywallLocked ? 'PREMIUM' : (language === 'kn' ? 'ಲಾಕ್ ಆಗಿದೆ' : 'LOCKED')}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '120px' }}>
                                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{language === 'kn' ? 'ಅಂಕಗಳು' : 'Status'}</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: lesson.progress === 100 ? '#10b981' : 'var(--text-main)' }}>
                                                        {lesson.progress === 100 ? (language === 'kn' ? 'ಪೂರ್ಣಗೊಂಡಿದೆ' : 'Completed') : (language === 'kn' ? 'ಬಾಕಿ ಇದೆ' : 'Pending')}
                                                    </span>
                                                </div>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '120px' }}>
                                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{language === 'kn' ? 'ಸಮಯ' : 'Time'}</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{lesson.estimated_time || '30'}m</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                                <button 
                                                    className="btn" 
                                                    style={{ 
                                                        background: isLocked ? 'var(--bg-dark)' : '#eab308', 
                                                        color: isLocked ? 'var(--text-muted)' : '#000', 
                                                        padding: '0.8rem 2.5rem', 
                                                        borderRadius: '12px', 
                                                        fontWeight: 800, 
                                                        fontSize: '1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        opacity: isLocked ? 0.6 : 1
                                                    }}
                                                    disabled={isLocked}
                                                >
                                                    {lesson.progress === 100 ? (language === 'kn' ? 'ಮತ್ತೆ ನೋಡಿ' : 'Review Result') : (language === 'kn' ? 'ಪರೀಕ್ಷೆ ಆರಂಭಿಸಿ' : 'Take Exam Now')}
                                                    <ArrowRight size={20} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* Final Graduation Exam Uploader (Admin Only) */}
                    {isMod && (
                        <div style={{ marginTop: '3rem', padding: '2.5rem', border: '2px dashed #eab308', borderRadius: '24px', textAlign: 'center', background: 'rgba(234, 179, 8, 0.05)' }}>
                            <Trophy size={48} color="#eab308" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: 'var(--text-main)' }}>{language === 'kn' ? 'ಅಂತಿಮ ಪದವಿ ಪರೀಕ್ಷೆ ನಿರ್ವಹಣೆ' : 'Curriculum Governance'}</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px', marginInline: 'auto' }}>
                                {language === 'kn' ? 'ಇಡೀ ಪಠ್ಯಕ್ರಮದ ಅಂತಿಮ ಪರೀಕ್ಷೆಯನ್ನು ಇಲ್ಲಿ ಸೇರಿಸಿ ಅಥವಾ ಬದಲಾಯಿಸಿ.' : 'Upload or update the final assessment representing the complete curriculum mastery.'}
                            </p>
                            <button 
                                onClick={onAddLesson} 
                                className="btn"
                                style={{ background: '#eab308', color: '#000', fontWeight: 800, padding: '0.75rem 2rem' }}
                            >
                                <Plus size={18} /> {language === 'kn' ? 'ಅಂತಿಮ ಪರೀಕ್ಷೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ' : 'Upload Milestone Exam'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Library;
