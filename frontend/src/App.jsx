import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import api, { authApi } from './utils/api';
import { ToastProvider, useToast } from './components/Toast';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AssessmentInterface from './components/AssessmentInterface';
import LessonCreate from './components/LessonCreate';
import Library from './components/Library';
import CoachingPage from './components/CoachingPage';
import LandingPage from './components/LandingPage';
import ProfileSettings from './components/ProfileSettings';
import PlacementTest from './components/PlacementTest';
import UserManagement from './components/UserManagement';
import CheckoutSync from './components/CheckoutSync';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import UniversalStudyArea from './components/UniversalStudyArea/UniversalStudyArea';
import ExamUpload from './components/ExamUpload';

// ── Auth Helpers ──────────────────────────────────────────────────────────
function getStoredUser() {
  try {
    const saved = localStorage.getItem('simplish_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// ── Protected App Shell ──────────────────────────────────────────────────
function AppShell() {
  const [user, setUser] = useState(() => getStoredUser());
  const [language, setLanguage] = useState(() => localStorage.getItem('simplish_language') || 'kn');
  const [selectedLesson, setSelectedLesson] = useState(() => {
    try {
      const saved = localStorage.getItem('simplish_active_lesson');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthSuccess = (userData, token) => {
    const normalized = { ...userData, role: userData?.role?.toLowerCase() };
    const userWithAuth = { ...normalized, isLoggedIn: true, token };
    localStorage.setItem('simplish_user', JSON.stringify(userWithAuth));
    localStorage.setItem('simplish_token', token);
    setUser(userWithAuth);

    if (!userWithAuth.onboarding_completed) {
      navigate('/placement');
    } else {
      navigate('/');
    }
  };

  const refreshUserContext = async () => {
    try {
      const token = localStorage.getItem('simplish_token');
      if (!token) return;
      
      const res = await authApi.getProfile(token);
      if (res.data && res.data.user) {
        const normalized = {
          ...res.data.user,
          role: res.data.user.role?.toLowerCase(),
          isLoggedIn: true,
          token
        };
        localStorage.setItem('simplish_user', JSON.stringify(normalized));
        setUser(normalized);
      }
    } catch (err) {
      console.error('Failed to refresh user context:', err);
    }
  };

  // ── Sync Profile on Load ────────────────────────────────────────────────
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

  React.useEffect(() => {
    const syncProfile = async () => {
      const storedToken = localStorage.getItem('simplish_token');
      const storedUser = localStorage.getItem('simplish_user');

      if (!storedToken && !storedUser) {
        setLoading(false);
        return;
      }

      try {
        const [profileRes, progressRes] = await Promise.allSettled([
          api.get('/auth/profile'),
          api.get('/lessons/my-progress')
        ]);

        if (profileRes.status === 'fulfilled' && profileRes.value.data?.user) {
          const updatedUser = { ...profileRes.value.data.user, isLoggedIn: true };
          localStorage.setItem('simplish_user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }

        if (progressRes.status === 'fulfilled') {
          const lessons = Array.isArray(progressRes.value.data) ? progressRes.value.data : (progressRes.value.data?.lessons || []);
          if (selectedLesson && lessons.length > 0) {
            const exists = lessons.find(l => l.id === selectedLesson.id);
            if (!exists) {
              localStorage.removeItem('simplish_active_lesson');
              setSelectedLesson(null);
            }
          } else if (lessons.length === 0) {
            localStorage.removeItem('simplish_active_lesson');
            setSelectedLesson(null);
          }
        }
      } catch (err) {
        console.log('Session synchronization issues:', err);
        localStorage.removeItem('simplish_user');
        localStorage.removeItem('simplish_token');
        localStorage.removeItem('simplish_active_lesson');
        setUser(null);
        setSelectedLesson(null);
      } finally {
        setLoading(false);
      }
    };
    syncProfile();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedLesson]);

  const handleLogout = () => {
    localStorage.removeItem('simplish_user');
    localStorage.removeItem('simplish_token');
    localStorage.removeItem('simplish_active_lesson');
    setUser(null);
    setSelectedLesson(null);
    navigate('/');
  };

  const handleNavigate = async (view) => {
    const role = user?.role?.toLowerCase();
    if ((view === 'admin' || view === 'edit_lesson') && role !== 'moderator' && role !== 'admin' && role !== 'super_admin') {
      showToast('Access Denied: Admin access required', 'error');
      return;
    }
    if (view === 'users' && role !== 'super_admin') {
      showToast('Access Denied: Super Admin Only', 'error');
      return;
    }

    if (view === 'study_area') {
      setCourseCompleted(false);
      try {
        const res = await api.get('/lessons/my-progress');
        let lessons = Array.isArray(res.data) ? res.data : (res.data.lessons || []);

        if (lessons.length === 0) {
          localStorage.removeItem('simplish_active_lesson');
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

        const levelOrder = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3, 'Expert': 4 };
        lessons.sort((a, b) => {
          const orderA = levelOrder[a.level] || 99;
          const orderB = levelOrder[b.level] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return (a.display_order || 0) - (b.display_order || 0);
        });

        const nextIncomplete = lessons.find(l => l.status !== 'completed');
        if (nextIncomplete) {
          startLesson(nextIncomplete);
          return;
        } else {
          setCourseCompleted(true);
          setSelectedLesson(lessons[lessons.length - 1]);
          navigate('/study_area');
          return;
        }
      } catch (err) {
        console.error("Study area discovery failed", err);
        navigate('/library');
        return;
      }
    }
    navigate(`/${view}`);
  };

  const handleNextLesson = async () => {
    try {
      const res = await api.get('/lessons/my-progress');
      let lessons = Array.isArray(res.data) ? res.data : (res.data.lessons || []);
      const levelOrder = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3, 'Expert': 4 };
      lessons.sort((a, b) => {
        const orderA = levelOrder[a.level] || 99;
        const orderB = levelOrder[b.level] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.display_order || 0) - (b.display_order || 0);
      });

      const currentIndex = lessons.findIndex(l => l.id === selectedLesson?.id);
      if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
        const nextLesson = lessons[currentIndex + 1];
        startLesson(nextLesson);
      } else {
        const allDone = lessons.every(l => l.status === 'completed' || l.id === selectedLesson?.id);
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
  };

  const startLesson = (lesson) => {
    setSelectedLesson(lesson);
    localStorage.setItem('simplish_active_lesson', JSON.stringify(lesson));
    navigate('/study_area');
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loader" style={{ marginBottom: '1rem' }}></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Onboarding Guard: If logged in but not onboarded, FORCE to placement page
  // (except if already on the placement page, or if the user is a moderator/super_admin)
  const isPrivilegedRole = ['moderator', 'admin', 'super_admin'].includes(user?.role?.toLowerCase());
  if (!user.onboarding_completed && !isPrivilegedRole && location.pathname !== '/placement') {
    return <Navigate to="/placement" replace />;
  }

  const currentView = location.pathname.replace('/', '') || 'dashboard';

  return (
    <div className="app-container" style={{ paddingBottom: isMobile ? 'calc(var(--bottom-nav-height) + 1.5rem)' : 0 }}>
      {/* ── Unified Top Navigation ── */}
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        language={language}
        setLanguage={setLanguage}
        onNavigate={handleNavigate}
      />


      <div className="main-content" style={{ paddingLeft: 0 }}>
        <div style={{ 
          padding: isMobile ? '0 1rem 2rem 1rem' : '0 2rem 2rem 2rem', 
          maxWidth: '1600px', 
          margin: '0 auto',
          minHeight: 'calc(100vh - 70px)'
        }}>
          <Routes>
            <Route path="/placement" element={
              (isPrivilegedRole || user.onboarding_completed)
                ? <Navigate to="/" replace />
                : <PlacementTest onComplete={(result) => {
                  const updatedUser = {
                    ...user,
                    onboarding_completed: true,
                    current_level: result?.assignedLevel || user.current_level,
                    scorePercentage: result?.scorePercentage // For immediate UI update if needed
                  };
                  localStorage.setItem('simplish_user', JSON.stringify(updatedUser));
                  setUser(updatedUser);
                  showToast('ಕಲಿಕೆಗೆ ಸುಸ್ವಾಗತ! (Welcome to your learning journey!)', 'success');
                  navigate('/');
                }} />
            } />

            <Route path="/" element={
              <Dashboard user={user} onStartLesson={startLesson} language={language} />
            } />

            <Route path="/library" element={
              <Library
                user={user}
                onSelectLesson={startLesson}
                language={language}
                onEditLesson={(lesson) => {
                  const role = user.role?.toLowerCase();
                  if (role !== 'moderator' && role !== 'admin' && role !== 'super_admin') {
                    showToast('Access Denied: Admin access required', 'error');
                    return;
                  }
                  setSelectedLesson(lesson);
                  navigate('/edit_lesson');
                }}
                onAddLesson={() => {
                  const role = user.role?.toLowerCase();
                  if (role !== 'moderator' && role !== 'admin' && role !== 'super_admin') {
                    showToast('Access Denied: Admin access required', 'error');
                    return;
                  }
                  setSelectedLesson(null);
                  navigate('/edit_lesson');
                }}
                onAddExam={() => {
                  const role = user.role?.toLowerCase();
                  if (role !== 'moderator' && role !== 'admin' && role !== 'super_admin') {
                    showToast('Access Denied: Admin access required', 'error');
                    return;
                  }
                  navigate('/exam_upload');
                }}
              />
            } />

            <Route path="/coaching" element={
              selectedLesson
                ? <CoachingPage lesson={selectedLesson} onComplete={() => navigate('/assessment')} onBack={() => navigate('/library')} />
                : <Navigate to="/library" replace />
            } />

            <Route path="/study_area" element={
              selectedLesson
                ? <UniversalStudyArea
                  user={user}
                  lesson={selectedLesson}
                  language={language}
                  isCourseCompleted={courseCompleted}
                  onNextLesson={handleNextLesson}
                  onBack={() => navigate('/library')}
                />
                : <Navigate to="/library" replace />
            } />

            <Route path="/assessment" element={
              selectedLesson ? (
                <div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                      className="btn"
                      style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                      onClick={() => navigate('/coaching')}
                    >
                      ← Back to coaching
                    </button>
                  </div>
                  <AssessmentInterface
                    user={user}
                    lessonId={selectedLesson.id}
                    onNextLesson={startLesson}
                  />
                </div>
              ) : (
                <Navigate to="/library" replace />
              )
            } />

            <Route path="/admin" element={
              (user.role?.toLowerCase() === 'moderator' || user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin')
                ? <AdminDashboard user={user} />
                : <Navigate to="/" replace />
            } />

            <Route path="/exam_upload" element={
              (user.role?.toLowerCase() === 'moderator' || user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin')
                ? <ExamUpload onBack={() => navigate('/library')} />
                : <Navigate to="/" replace />
            } />

            <Route path="/edit_lesson" element={
              (user.role?.toLowerCase() === 'moderator' || user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin')
                ? <LessonCreate lesson={selectedLesson} onBack={() => navigate('/library')} />
                : <Navigate to="/" replace />
            } />

            <Route path="/users" element={
              user.role?.toLowerCase() === 'super_admin'
                ? <UserManagement />
                : <Navigate to="/" replace />
            } />


            <Route path="/payment" element={<CheckoutSync user={user} onUpdateUser={refreshUserContext} />} />

            <Route path="/profile" element={
              <ProfileSettings
                user={user}
                onBack={() => navigate('/')}
                language={language}
                onUpdate={(updatedUser) => {
                  const token = localStorage.getItem('simplish_token');
                  const normalized = {
                    ...updatedUser,
                    role: updatedUser.role?.toLowerCase() || user?.role,
                    isLoggedIn: true,
                    token: token
                  };
                  localStorage.setItem('simplish_user', JSON.stringify(normalized));
                  setUser(normalized);
                  showToast('Profile updated successfully!', 'success');
                }}
              />
            } />

            <Route path="/home" element={<LandingPage onAuthSuccess={handleAuthSuccess} />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <BottomNav 
        onNavigate={handleNavigate} 
        currentView={currentView} 
        user={user} 
        language={language}
      />
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
