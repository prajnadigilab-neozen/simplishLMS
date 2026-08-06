import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { safeSetItem, safeGetItem, safeRemoveItem } from './utils/storageUtils';
import { UserProvider, useUser } from './context/UserContext';
import { CurriculumProvider } from './context/CurriculumContext';
import { useCurriculum } from './hooks/useCurriculum';
import { ToastProvider, useToast } from './components/Toast';
import { authApi } from './utils/api';

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

  // Verify and sync Supabase onboarding_complete flag on every page load (navigation)
  React.useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user) {
        try {
          const storedToken = safeGetItem('simplish_token');
          if (storedToken) {
            const profileRes = await authApi.getProfile(storedToken);
            if (profileRes.data?.user) {
              const remoteOnboarded = profileRes.data.user.onboarding_completed || profileRes.data.user.onboarding_complete;
              const localOnboarded = user.onboarding_completed || user.onboarding_complete;
              if (remoteOnboarded !== localOnboarded) {
                const updatedUser = {
                  ...user,
                  onboarding_completed: remoteOnboarded,
                  onboarding_complete: remoteOnboarded
                };
                safeSetItem('simplish_user', updatedUser);
                setUser(updatedUser);
              }
            }
          }
        } catch (err) {
          console.error('Error verifying onboarding flag:', err);
        }
      }
    };
    checkOnboardingStatus();
  }, [location.pathname]);

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

  // Bypass SPA routing for server static assets (/sitemap.xml, /robots.txt)
  React.useEffect(() => {
    if (['/sitemap.xml', '/robots.txt'].includes(location.pathname)) {
      window.location.replace(location.pathname);
    }
  }, [location.pathname]);

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

  if (['/sitemap.xml', '/robots.txt'].includes(location.pathname)) {
    return null;
  }

  const isAuthenticated = !!user;
  const verifiedToken = safeGetItem('simplish_token');
  const isOnboarded = user && (user.onboarding_completed || user.onboarding_complete);

  // RouteGuard: Any attempt to access /profile or /placement without a verified auth_token and onboarding_complete: false must redirect to /auth
  if (['/profile', '/placement'].includes(location.pathname)) {
    if (!isAuthenticated || !verifiedToken) {
      return <Navigate to="/auth" replace />;
    }
    if (isOnboarded) {
      // Exception: allow taking the placement test if they haven't finished it yet
      const isFirstTimePlacement = location.pathname === '/placement' && !user.current_level;
      // Exception: allow fully onboarded users to update their profile settings normally
      const isNormalProfile = location.pathname === '/profile';
      
      if (!isFirstTimePlacement && !isNormalProfile) {
        return <Navigate to="/auth" replace />;
      }
    }
  }

  // Force redirection if logged in but not onboarded
  if (isAuthenticated && !isOnboarded && !isPrivileged && !['/profile', '/payment'].includes(location.pathname)) {
    return <Navigate to="/profile" replace />;
  }

  // Handle unauthorized navigation
  if (!isAuthenticated) {
    if (location.pathname !== '/auth') {
      return <Navigate to="/auth" replace />;
    }
    return <LandingPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Prevent accessing /auth when logged in
  if (location.pathname === '/auth') {
    return <Navigate to={isOnboarded ? "/" : "/profile"} replace />;
  }

  const currentView = location.pathname.replace('/', '') || 'dashboard';

  return (
    <div className="app-container" style={{ paddingBottom: isMobile ? 'calc(var(--bottom-nav-height) + 1.5rem)' : 0, overflowX: 'hidden', width: '100%', position: 'relative' }}>
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
            <Route path="/auth" element={
              user
                ? <Navigate to={user.onboarding_completed ? "/" : "/profile"} replace />
                : <LandingPage onAuthSuccess={handleAuthSuccess} />
            } />

            <Route path="/placement" element={
              (isPrivileged || (user.onboarding_completed && user.current_level))
                ? <Navigate to="/" replace />
                : <PlacementTest onComplete={(result) => {
                  const updatedUser = {
                    ...user,
                    onboarding_completed: true,
                    onboarding_complete: true,
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
