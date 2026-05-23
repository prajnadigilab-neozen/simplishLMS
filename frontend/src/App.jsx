import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { safeSetItem, safeGetItem, safeRemoveItem } from './utils/storageUtils';
import { UserProvider, useUser } from './context/UserContext';
import { CurriculumProvider } from './context/CurriculumContext';
import { useCurriculum } from './hooks/useCurriculum';
import { ToastProvider, useToast } from './components/Toast';

// ── Components ──────────────────────────────────────────────────────────
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import CoachingPage from './components/CoachingPage';
import AssessmentInterface from './components/AssessmentInterface';
import UniversalStudyArea from './components/UniversalStudyArea/UniversalStudyArea';
import PlacementTest from './components/PlacementTest';
import AdminDashboard from './components/AdminDashboard';
import ExamUpload from './components/ExamUpload';
import LessonCreate from './components/LessonCreate';
import UserManagement from './components/UserManagement';
import CheckoutSync from './components/CheckoutSync';
import ProfileSettings from './components/ProfileSettings';

// ── Protected App Shell ──────────────────────────────────────────────────
function AppShell() {
  const { 
    user, setUser, handleAuthSuccess, handleLogout, 
    language, setLanguage, loading, isPrivileged 
  } = useUser();

  const {
    selectedLesson, setSelectedLesson, startLesson,
    courseCompleted, handleNavigateToStudyArea, handleNextLesson
  } = useCurriculum();

  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (view) => {
    if ((view === 'admin' || view === 'edit_lesson') && !isPrivileged) {
      showToast('Access Denied: Admin access required', 'error');
      return;
    }
    if (view === 'users' && user?.role !== 'super_admin') {
      showToast('Access Denied: Super Admin Only', 'error');
      return;
    }

    if (view === 'study_area') {
      handleNavigateToStudyArea();
      return;
    }
    navigate(`/${view}`);
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

  // Onboarding Guard: If logged in but not onboarded, FORCE to placement page (unless paying or already there)
  if (!user.onboarding_completed && !isPrivileged && !['/placement', '/payment'].includes(location.pathname)) {
    return <Navigate to="/placement" replace />;
  }

  const currentView = location.pathname.replace('/', '') || 'dashboard';

  return (
    <div className="app-container" style={{ paddingBottom: isMobile ? 'calc(var(--bottom-nav-height) + 1.5rem)' : 0 }}>
      {/* ── Unified Top Navigation ── */}
      <Navbar onNavigate={handleNavigate} />


      <div className="main-content" style={{ paddingLeft: 0 }}>
        <div style={{ 
          padding: isMobile ? '0 1rem 2rem 1rem' : '0 2rem 2rem 2rem', 
          maxWidth: '1600px', 
          margin: '0 auto',
          minHeight: 'calc(100vh - 70px)'
        }}>
          <Routes>
            <Route path="/placement" element={
              (isPrivileged || user.onboarding_completed)
                ? <Navigate to="/" replace />
                : <PlacementTest onComplete={(result) => {
                  const updatedUser = {
                    ...user,
                    onboarding_completed: true,
                    current_level: result?.assignedLevel || user.current_level,
                    scorePercentage: result?.scorePercentage // For immediate UI update if needed
                  };
                  safeSetItem('simplish_user', updatedUser);
                  setUser(updatedUser);
                  showToast('ಕಲಿಕೆಗೆ ಸುಸ್ವಾಗತ! (Welcome to your learning journey!)', 'success');
                  navigate('/');
                }} />
            } />

            <Route path="/" element={
              <Dashboard 
                onStartLesson={startLesson} 
                onEditLesson={(lesson) => {
                  if (!isPrivileged) {
                    showToast('Access Denied: Admin access required', 'error');
                    return;
                  }
                  setSelectedLesson(lesson);
                  navigate('/edit_lesson');
                }}
              />
            } />

            <Route path="/library" element={
              <Library
                onSelectLesson={startLesson}
                onEditLesson={(lesson) => {
                  if (!isPrivileged) {
                    showToast('Access Denied: Admin access required', 'error');
                    return;
                  }
                  setSelectedLesson(lesson);
                  navigate('/edit_lesson');
                }}
                onAddLesson={() => {
                  if (!isPrivileged) {
                    showToast('Access Denied: Admin access required', 'error');
                    return;
                  }
                  setSelectedLesson(null);
                  navigate('/edit_lesson');
                }}
                onAddExam={() => {
                  if (!isPrivileged) {
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
                  lesson={selectedLesson}
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
                    lessonId={selectedLesson.id}
                    onNextLesson={startLesson}
                  />
                </div>
              ) : (
                <Navigate to="/library" replace />
              )
            } />

            <Route path="/admin" element={
              isPrivileged
                ? <AdminDashboard user={user} />
                : <Navigate to="/" replace />
            } />

            <Route path="/exam_upload" element={
              isPrivileged
                ? <ExamUpload user={user} onBack={() => navigate('/library')} />
                : <Navigate to="/" replace />
            } />

            <Route path="/edit_lesson" element={
              isPrivileged
                ? <LessonCreate user={user} lesson={selectedLesson} onBack={() => navigate('/library')} />
                : <Navigate to="/" replace />
            } />

            <Route path="/users" element={
              user?.role?.toLowerCase()?.replace(/\s+|_/g, '_') === 'super_admin'
                ? <UserManagement currentUser={user} />
                : <Navigate to="/" replace />
            } />


            <Route path="/payment" element={<CheckoutSync />} />

            <Route path="/profile" element={
              <ProfileSettings onBack={() => navigate('/')} />
            } />

            <Route path="/home" element={<LandingPage onAuthSuccess={handleAuthSuccess} />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <BottomNav 
        onNavigate={handleNavigate} 
        currentView={currentView} 
      />
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <UserProvider>
          <CurriculumProvider>
            <AppShell />
          </CurriculumProvider>
        </UserProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
