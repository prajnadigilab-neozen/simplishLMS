import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/storageUtils';
import { useToast } from '../components/Toast';

const CurriculumContext = createContext();

export const CurriculumProvider = ({ children }) => {
    const [selectedLesson, setSelectedLesson] = useState(() => safeGetItem('simplish_active_lesson', true));
    const [courseCompleted, setCourseCompleted] = useState(false);
    const navigate = useNavigate();
    const showToast = useToast();

    const levelOrder = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3, 'Expert': 4 };

    const sortLessons = useCallback((lessons) => {
        return [...lessons].sort((a, b) => {
            const orderA = levelOrder[a.level] || 99;
            const orderB = levelOrder[b.level] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return (a.display_order || 0) - (b.display_order || 0);
        });
    }, []);

    const startLesson = useCallback((lesson) => {
        setSelectedLesson(lesson);
        safeSetItem('simplish_active_lesson', lesson);
        navigate('/study_area');
    }, [navigate]);

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
