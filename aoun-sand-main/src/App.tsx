import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { DonatePage } from './pages/DonatePage';
import { ContactPage } from './pages/ContactPage';
import { LessonsPage } from './pages/LessonsPage';
import { DonationExpensesPage } from './pages/DonationExpensesPage';
import { AuthPage } from './pages/AuthPage';
import { AdminPage } from './pages/AdminPage';
import { AccountPage } from './pages/AccountPage';
import { UserRequestsPage } from './pages/UserRequestsPage';
import { MahajaDashboard } from './pages/MahajaDashboard';
import { MahajaCoursePage } from './pages/MahajaCoursePage';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useLanguage } from './contexts/LanguageContext';
import { Clock, XCircle, Ban, LogOut } from 'lucide-react';
import { AvatarPromptModal } from './components/AvatarPromptModal';
import { VerifyCardPage } from './pages/VerifyCardPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {

  const { user, userProfile, loading, isAdmin, logout } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const isRTL = language === 'ar';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative w-24 h-24 flex items-center justify-center mb-8">
          <div className="absolute inset-0 rounded-full border-t-4 border-primary dark:border-primary-light animate-spin opacity-75"></div>
          <div className="absolute inset-2 rounded-full border-r-4 border-secondary-dark dark:border-secondary animate-spin-slow opacity-75"></div>
          <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-secondary rounded-full animate-pulse"></div>
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary-dark">
          {isRTL ? 'جاري تجهيز بيئة العمل...' : 'Preparing workspace...'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Please wait while we verify your session</p>
      </div>
    );
  }

  if (!user && !isAdmin) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Intercept users without an avatar
  if (user && !isAdmin && userProfile && !userProfile.avatar_url) {
    return <AvatarPromptModal />;
  }

  // Intercept Mahaja users to isolate them to /mahaja
  if (user && !isAdmin && userProfile?.is_mahaja) {
    if (location.pathname !== '/mahaja') {
      return <Navigate to="/mahaja" replace />;
    }
    return <>{children}</>;
  }

  // Intercept normal users who are not approved
  if (user && !isAdmin) {
    const status = userProfile?.approval_status || 'Pending Approval';

    if (status !== 'Approved') {
      let title = '';
      let message = '';
      let Icon = Clock;
      let colorClass = 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';

      if (status === 'Pending Approval') {
        title = isRTL ? 'قيد الانتظار' : 'Awaiting Approval';
        message = isRTL 
          ? 'حسابك في انتظار موافقة المسؤول.'
          : 'Your account is awaiting administrator approval.';
        Icon = Clock;
        colorClass = 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
      } else if (status === 'Rejected') {
        title = isRTL ? 'تم رفض الحساب' : 'Account Rejected';
        message = isRTL 
          ? 'لقد تم رفض طلب التسجيل الخاص بك.'
          : 'Your registration request has been rejected.';
        Icon = XCircle;
        colorClass = 'text-red-500 bg-red-50 dark:bg-red-900/20';
      } else if (status === 'Suspended') {
        title = isRTL ? 'تم تعليق الحساب' : 'Account Suspended';
        message = isRTL 
          ? 'تم تعليق حسابك.' 
          : 'Your account has been suspended.';
        Icon = Ban;
        colorClass = 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-6">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${colorClass}`}>
              <Icon className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                {title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                {message}
              </p>
            </div>

            <button 
              onClick={logout}
              className="w-full py-4 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span>{isRTL ? 'تسجيل الخروج' : 'Log Out'}</span>
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  // Admin page also hides all user-facing chrome (Header, Nav, Notifications)
  // to prevent context leakage and unnecessary queries during admin sessions
  const isAdminPage = location.pathname === '/admin';
  const { userProfile } = useAuth();
  const isMahajaUser = userProfile?.is_mahaja === true;
  const isShellHidden = isAuthPage || isAdminPage || isMahajaUser;

  // Register service worker + listen for push notifications via Supabase Realtime
  usePushNotifications();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {!isShellHidden && <PWAInstallPrompt />}
      {!isShellHidden && <Header />}
      {!isShellHidden && <NotificationsModal />}
      <main className={`flex-1 ${!isShellHidden ? 'pb-16' : ''}`}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/verify-card/:id" element={<VerifyCardPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
          <Route path="/donate" element={<ProtectedRoute><DonatePage /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
          <Route path="/lessons" element={<ProtectedRoute><LessonsPage /></ProtectedRoute>} />
          <Route path="/mahaja" element={<ProtectedRoute><MahajaDashboard /></ProtectedRoute>} />
          <Route path="/mahaja/course/:id" element={<ProtectedRoute><MahajaCoursePage /></ProtectedRoute>} />
          <Route path="/donation-expenses" element={<ProtectedRoute><DonationExpensesPage /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><UserRequestsPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        </Routes>
      </main>
      {!isShellHidden && <BottomNav />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </QueryClientProvider>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
