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
                                    onClick={toggleLevel}
                                    style={{
                                        padding: window.innerWidth < 640 ? '1rem 1.25rem' : '1.5rem 2rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderLeft: '6px solid #0052cc',
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                            {language === 'kn' ? `ಹಂತ ${levelIndex + 1}` : `LEVEL ${levelIndex + 1}`}
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0052cc' }}>{lvl} English</h2>
                                    </div>
                                    <ArrowRight size={24} style={{ transform: isLevelExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.3s', color: '#64748b' }} />
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
                                                                style={{
                                                                    background: '#ffffff',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '12px',
                                                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    opacity: isLocked ? 0.7 : 1,
                                                                    filter: isLocked ? 'grayscale(0.6)' : 'none',
                                                                    transition: 'all 0.2s ease',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                                }}
                                                                whileHover={!isLocked ? { translateY: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } : {}}
                                                                onClick={() => {
                                                                    if (isPaywallLocked) { navigate('/payment'); return; }
                                                                    if (isPrereqLocked) { 
                                                                        showToast(`ದಯವಿಟ್ಟು ಮೊದಲು ಹಿಂದಿನ ಪಾಠವನ್ನು ಮುಗಿಸಿ: "${prevLesson.title}" (Please finish the previous lesson first)`, 'info');
                                                                        return; 
                                                                    }
                                                                    onSelectLesson(lesson);
                                                                }}
                                                            >
                                                                {/* Top Section */}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: lesson.content?.isExam ? '#fef3c7' : '#e0e7ff', color: lesson.content?.isExam ? '#d97706' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            {lesson.content?.isExam ? <Trophy size={20} /> : getIcon(lesson.media_type)}
                                                                        </div>
                                                                        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, color: '#0f172a' }}>{lesson.title}</h3>
                                                                        {isLocked && (
                                                                            <span style={{ background: isPaywallLocked ? '#e0e7ff' : '#f1f5f9', color: isPaywallLocked ? '#4f46e5' : '#64748b', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                                <Lock size={12} /> {isPaywallLocked ? 'PREMIUM' : 'LOCKED'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {isMod && (
                                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                            <button onClick={(e) => { e.stopPropagation(); onEditLesson(lesson); }} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={16} /></button>
                                                                            <button onClick={(e) => handleDelete(e, lesson.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Divider */}
                                                                <div style={{ height: '1px', background: '#e2e8f0', width: '100%' }} />

                                                                {/* Bottom Section */}
                                                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                                    {/* Info row */}
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', width: '100%', justifyContent: 'space-between' }}>
                                                                        {!lesson.content?.isFinal && (
                                                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                                                <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>LEVEL</span>
                                                                                <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>{lesson.level}</span>
                                                                            </div>
                                                                        )}
                                                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>Status</span>
                                                                            <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                                                                                {lesson.progress === 100 
                                                                                    ? (language === 'kn' ? 'ಪೂರ್ಣಗೊಂಡಿದೆ' : 'Completed') 
                                                                                    : (language === 'kn' ? 'ಬಾಕಿ ಇದೆ' : 'Not Completed')}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>Score</span>
                                                                            <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                                                                                {lesson.score !== null && lesson.score !== undefined 
                                                                                    ? `${lesson.score}%` 
                                                                                    : (language === 'kn' ? 'ಅಂಕಗಳಿಲ್ಲ' : 'No Score')}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Footer row */}
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                                            <Clock size={16} /> {lesson.estimated_time || '15'}m
                                                                        </div>
                                                                        <button 
                                                                            style={{ 
                                                                                background: isLocked ? '#e2e8f0' : '#0052cc', 
                                                                                color: isLocked ? '#94a3b8' : '#ffffff', 
                                                                                border: 'none', 
                                                                                padding: '0.6rem 1.25rem', 
                                                                                borderRadius: '8px', 
                                                                                fontSize: '0.9rem', 
                                                                                fontWeight: 700, 
                                                                                display: 'flex', 
                                                                                alignItems: 'center', 
                                                                                gap: '0.4rem',
                                                                                cursor: isLocked ? 'not-allowed' : 'pointer'
                                                                            }}
                                                                            disabled={isLocked}
                                                                        >
                                                                            {lesson.progress === 100 && !isLocked
                                                                                ? <>{language === 'kn' ? 'ಮತ್ತೆ ಕಲಿಯಿರಿ' : 'Revise'} <ArrowRight size={16} /></> 
                                                                                : <>{language === 'kn' ? 'ಪ್ರಾರಂಭಿಸಿ' : 'Start'} <ArrowRight size={16} /></>}
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
                                                {lesson.progress === 100 && lesson.score !== null && lesson.score !== undefined && (
                                                    <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px dashed rgba(234, 179, 8, 0.3)', padding: '0.6rem 1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '120px' }}>
                                                        <span style={{ fontSize: '0.6rem', color: '#eab308', fontWeight: 800, textTransform: 'uppercase' }}>{language === 'kn' ? 'ಗಳಿಸಿದ ಅಂಕಗಳು' : 'Score'}</span>
                                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#eab308' }}>
                                                            {lesson.score}% ({(() => {
                                                                const score = lesson.score;
                                                                if (score >= 90) return 'A+';
                                                                if (score >= 80) return 'A';
                                                                if (score >= 70) return 'B';
                                                                if (score >= 60) return 'C';
                                                                return 'D';
                                                            })()})
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {lesson.progress === 100 && (lesson.content?.graduation_retention_block?.encouragement_kannada || lesson.content?.graduation_retention_block?.encouragement_english) && (
                                                <div style={{
                                                    background: 'rgba(234, 179, 8, 0.05)',
                                                    borderLeft: '4px solid #eab308',
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    marginTop: '0.75rem',
                                                    fontSize: '0.9rem',
                                                    color: 'var(--text-main)',
                                                    lineHeight: '1.6',
                                                    fontStyle: 'italic',
                                                    width: '100%'
                                                }}>
                                                    {language === 'kn' ? lesson.content.graduation_retention_block.encouragement_kannada : (lesson.content.graduation_retention_block.encouragement_english || lesson.content.graduation_retention_block.encouragement_kannada)}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                {lesson.progress === 100 ? (
                                                    <>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isPaywallLocked) { navigate('/payment'); return; }
                                                                if (isPrereqLocked) { 
                                                                    showToast(`ದಯವಿಟ್ಟು ಮೊದಲು ಹಿಂದಿನ ಪಾಠವನ್ನು ಮುಗಿಸಿ: "${prevLesson?.title || ''}" (Please finish the previous lesson first)`, 'info');
                                                                    return; 
                                                                }
                                                                onSelectLesson(lesson);
                                                            }}
                                                            className="btn" 
                                                            style={{ 
                                                                background: '#eab308', 
                                                                color: '#000', 
                                                                padding: '0.8rem 2rem', 
                                                                borderRadius: '12px', 
                                                                fontWeight: 800, 
                                                                fontSize: '1rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <RefreshCw size={18} />
                                                            {language === 'kn' ? 'ಮತ್ತೆ ಪರೀಕ್ಷೆ ತೆಗೆದುಕೊಳ್ಳಿ' : 'Retake Exam'}
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isPaywallLocked) { navigate('/payment'); return; }
                                                                if (isPrereqLocked) { 
                                                                    showToast(`ದಯವಿಟ್ಟು ಮೊದಲು ಹಿಂದಿನ ಪಾಠವನ್ನು ಮುಗಿಸಿ: "${prevLesson?.title || ''}" (Please finish the previous lesson first)`, 'info');
                                                                    return; 
                                                                }
                                                                onSelectLesson(lesson, { reviewMode: true });
                                                            }}
                                                            className="btn" 
                                                            style={{ 
                                                                background: 'rgba(234, 179, 8, 0.2)', 
                                                                color: '#eab308', 
                                                                border: '2px solid #eab308',
                                                                padding: '0.8rem 2rem', 
                                                                borderRadius: '12px', 
                                                                fontWeight: 800, 
                                                                fontSize: '1rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Trophy size={18} />
                                                            {language === 'kn' ? 'ಪರೀಕ್ಷೆ ವಿಶ್ಲೇಷಿಸಿ' : 'Review Exam'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isPaywallLocked) { navigate('/payment'); return; }
                                                            if (isPrereqLocked) { 
                                                                showToast(`ದಯವಿಟ್ಟು ಮೊದಲು ಹಿಂದಿನ ಪಾಠವನ್ನು ಮುಗಿಸಿ: "${prevLesson?.title || ''}" (Please finish the previous lesson first)`, 'info');
                                                                return; 
                                                            }
                                                            onSelectLesson(lesson);
                                                        }}
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
                                                        {language === 'kn' ? 'ಪರೀಕ್ಷೆ ಆರಂಭಿಸಿ' : 'Take Exam Now'}
                                                        <ArrowRight size={20} />
                                                    </button>
                                                )}
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
