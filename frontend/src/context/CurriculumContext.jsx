import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/storageUtils';
import { useToast } from '../components/Toast';
import { useUser } from './UserContext';

const CurriculumContext = createContext();

export const CurriculumProvider = ({ children }) => {
    const { user, isPrivileged, language } = useUser();
    const [selectedLesson, setSelectedLesson] = useState(() => safeGetItem('simplish_active_lesson', true));
    const [courseCompleted, setCourseCompleted] = useState(false);
    const navigate = useNavigate();
    const showToast = useToast();

    const levelOrder = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3, 'Expert': 4 };

    const sortLessons = useCallback((lessons) => {
        const levels = ["Basic", "Intermediate", "Advanced", "Expert"];
        return [...lessons].sort((a, b) => {
            const levelDiff = levels.indexOf(a.level) - levels.indexOf(b.level);
            if (levelDiff !== 0) return levelDiff;

            // 1. Final Graduation Exam always absolute last in the level
            const aIsFinal = !!a.content?.isFinal || a.title?.toLowerCase().includes('graduation');
            const bIsFinal = !!b.content?.isFinal || b.title?.toLowerCase().includes('graduation');
            if (aIsFinal && !bIsFinal) return 1;
            if (!aIsFinal && bIsFinal) return -1;

            // 2. Extract lesson numbers from title if possible
            const extractLessonNumber = (title) => {
                const match = (title || "").match(/(?:Lesson|ಪಾಠ)\s+(\d+)/i);
                return match ? parseInt(match[1], 10) : 0;
            };
            const numA = extractLessonNumber(a.title);
            const numB = extractLessonNumber(b.title);

            if (numA > 0 && numB > 0) {
                if (numA !== numB) return numA - numB;
            } else if (numA > 0 && numB === 0) {
                return -1;
            } else if (numA === 0 && numB > 0) {
                return 1;
            }

            // 3. Within same unit, Module Exams always last
            const aIsExam = !!a.content?.isExam;
            const bIsExam = !!b.content?.isExam;
            if (aIsExam && !bIsExam) return 1;
            if (!aIsExam && bIsExam) return -1;

            // 4. Fallback to display order
            const dispA = Number(a.display_order) || 0;
            const dispB = Number(b.display_order) || 0;
            return dispA - dispB;
        });
    }, []);

    const checkIsPaywallLocked = useCallback((lesson) => {
        if (!lesson) return false;
        if (isPrivileged || user?.is_paid) return false;
        
        if (lesson.level === 'Basic') {
            const match = (lesson.title || "").match(/(?:Lesson|ಪಾಠ)\s+(\d+)/i);
            const num = match ? parseInt(match[1], 10) : 0;
            if (num === 1 || num === 2) {
                return false;
            }
        }
        return true;
    }, [user, isPrivileged]);

    const startLesson = useCallback((lesson) => {
        if (checkIsPaywallLocked(lesson)) {
            showToast(
                language === 'kn' 
                    ? 'ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ಪ್ರೀಮಿಯಂಗೆ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ. (Please upgrade to Premium to access this lesson.)' 
                    : 'Please upgrade to Premium to access this lesson.', 
                'warning'
            );
            navigate('/payment');
            return;
        }
        setSelectedLesson(lesson);
        safeSetItem('simplish_active_lesson', lesson);
        navigate('/study_area');
    }, [navigate, checkIsPaywallLocked, showToast, language]);

    useEffect(() => {
        if (selectedLesson && checkIsPaywallLocked(selectedLesson)) {
            safeRemoveItem('simplish_active_lesson');
            setSelectedLesson(null);
        }
    }, [selectedLesson, checkIsPaywallLocked]);

    const handleNavigateToStudyArea = useCallback(async () => {
        setCourseCompleted(false);
        try {
            const res = await api.get('/lessons/my-progress');
            let lessons = Array.isArray(res.data) ? res.data : (res.data.lessons || []);

            if (lessons.length === 0) {
                safeRemoveItem('simplish_active_lesson');
                setSelectedLesson(null);
                showToast('ಲೈಬ್ರರಿಯಲ್ಲಿ ಮೊದಲು ಪಾಠವನ್ನು ಆಯ್ಕೆಮಾಡಿ (Please select a lesson from Library first)', 'info');
                navigate('/library');
                return;
            }

            let currentValid = lessons.find(l => l.id === selectedLesson?.id);
            if (currentValid && currentValid.status !== 'completed') {
                startLesson(currentValid);
                return;
            }

            const sorted = sortLessons(lessons);
            const nextIncomplete = sorted.find(l => l.status !== 'completed');
            
            if (nextIncomplete) {
                startLesson(nextIncomplete);
            } else {
                setCourseCompleted(true);
                setSelectedLesson(sorted[sorted.length - 1]);
                navigate('/study_area');
            }
        } catch (err) {
            console.error("Study area discovery failed", err);
            navigate('/library');
        }
    }, [selectedLesson, startLesson, navigate, showToast, sortLessons]);

    const handleNextLesson = useCallback(async () => {
        try {
            const res = await api.get('/lessons/my-progress');
            let lessons = Array.isArray(res.data) ? res.data : (res.data.lessons || []);
            const sorted = sortLessons(lessons);

            const currentIndex = sorted.findIndex(l => l.id === selectedLesson?.id);
            if (currentIndex !== -1 && currentIndex < sorted.length - 1) {
                const nextLesson = sorted[currentIndex + 1];
                startLesson(nextLesson);
            } else {
                const allDone = sorted.every(l => l.status === 'completed' || l.id === selectedLesson?.id);
                if (allDone) {
                    setCourseCompleted(true);
                } else {
                    showToast('ಅದ್ಭುತ! ನೀವು ಈ ಪಾಠವನ್ನು ಮುಗಿಸಿದ್ದೀರಿ. (Great job! You finished this lesson.)', 'success');
                    navigate('/library');
                }
            }
        } catch (err) {
            console.error("Next lesson navigation failed", err);
            navigate('/library');
        }
    }, [selectedLesson, startLesson, navigate, showToast, sortLessons]);

    const clearActiveLesson = useCallback(() => {
        safeRemoveItem('simplish_active_lesson');
        setSelectedLesson(null);
    }, []);

    const value = {
        selectedLesson,
        setSelectedLesson,
        courseCompleted,
        setCourseCompleted,
        startLesson,
        handleNavigateToStudyArea,
        handleNextLesson,
        clearActiveLesson
    };

    return (
        <CurriculumContext.Provider value={value}>
            {children}
        </CurriculumContext.Provider>
    );
};

export const useCurriculumContext = () => {
    const context = useContext(CurriculumContext);
    if (!context) {
        throw new Error('useCurriculumContext must be used within a CurriculumProvider');
    }
    return context;
};
