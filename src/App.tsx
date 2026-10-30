import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SystemDateProvider, useSystemDate } from './context/SystemDateContext.tsx';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DateSimulatorModal } from './components/DateSimulatorModal.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';

// Public & Authentication Pages
import { LandingPage } from './pages/auth/LandingPage.tsx';
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { RegisterPage } from './pages/auth/RegisterPage.tsx';
import { DemoPage } from './pages/auth/DemoPage.tsx';

// First-Login / Onboarding Pages
import { SelectTypePage } from './pages/onboarding/SelectTypePage.tsx';
import { AicteSelectRolePage } from './pages/onboarding/AicteSelectRolePage.tsx';
import { InstitutionSelectPage } from './pages/onboarding/InstitutionSelectPage.tsx';

// Core Workflow Pages
import { Dashboard } from './pages/Dashboard.tsx';
import { FDRList } from './pages/FDRList.tsx';
import { FDRCreate } from './pages/FDRCreate.tsx';
import { FDRDetail } from './pages/FDRDetail.tsx';
import { Institutions } from './pages/Institutions.tsx';
import { RegisterInstitution } from './pages/RegisterInstitution.tsx';
import { InstitutionProfile } from './pages/InstitutionProfile.tsx';
import { InstitutionVaultPage } from './pages/InstitutionVaultPage.tsx';
import { DocumentVault } from './pages/DocumentVault.tsx';
import { DocumentViewerPage } from './pages/DocumentViewerPage.tsx';
import { ReleaseRequests } from './pages/ReleaseRequests.tsx';
import { ClearanceMatrixPage } from './pages/ClearanceMatrixPage.tsx';
import { MaturityCalendar } from './pages/MaturityCalendar.tsx';
import { PolicyConfigPage } from './pages/PolicyConfigPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { AuditLogPage } from './pages/AuditLogPage.tsx';
import { AdminUsersPage } from './pages/AdminUsersPage.tsx';
import { UserProfilePage } from './pages/UserProfilePage.tsx';
import { SystemSettingsPage } from './pages/SystemSettingsPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { PendingApprovalView } from './components/PendingApprovalView.tsx';

import { isInstitutionRole } from './types/index.ts';
import { Building2, RefreshCw } from 'lucide-react';

/**
 * Loading fallback while Firebase auth and profile initialize
 */
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#07162b] flex flex-col items-center justify-center p-6 text-center text-slate-100">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-blue-950 shadow-2xl mb-4 animate-pulse">
      <Building2 className="w-8 h-8" />
    </div>
    <div className="flex items-center gap-2 mb-1">
      <h2 className="text-xl font-black tracking-tight text-white">AICTE FDR360</h2>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
        SIH26265
      </span>
    </div>
    <p className="text-xs text-slate-400 flex items-center gap-2 mt-2">
      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
      <span>Initializing Secure AICTE Security Session...</span>
    </p>
  </div>
);

/**
 * Main Layout for Authenticated Pages
 */
interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  const { user, isDemoMode } = useAuth();
  const { refreshTrigger } = useSystemDate();
  const navigate = useNavigate();

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Fetch unread count for badge
  useEffect(() => {
    if (user || isDemoMode) {
      fetch('/api/notifications')
        .then(res => res.json())
        .then(data => {
          setUnreadCount(data.unreadCount || 0);
        })
        .catch(() => {});
    }
  }, [refreshTrigger, user, isDemoMode]);

  const handleNotificationLink = (linkType: string, linkId: string) => {
    if (linkType === 'FDR') {
      navigate(`/fdr/${linkId}`);
    } else if (linkType === 'RELEASE') {
      navigate(`/release?selectId=${linkId}`);
    } else if (linkType === 'INSTITUTION') {
      navigate(`/institution/${linkId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-900 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadCount}
        onToggleSidebarMobile={() => setMobileSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Date Simulator Modal */}
      <DateSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectLink={handleNotificationLink}
      />
    </div>
  );
};

/**
 * Route protection wrapper:
 * - Unauthenticated -> redirect to /login
 * - Incomplete profile -> redirect to /select-type
 * - Pending AICTE user -> PendingApprovalView
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isDemoMode } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user && !isDemoMode) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Profile incomplete flow
  if (!isDemoMode && user && user.onboardingComplete === false) {
    return <Navigate to="/select-type" replace />;
  }

  // Pending AICTE user view (awaiting portal admin approval)
  if (!isDemoMode && user && user.accountType === 'AICTE' && user.accountStatus === 'PENDING') {
    return <PendingApprovalView />;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
};

/**
 * Onboarding Route Protection:
 * - Must be authenticated
 * - If profile already complete, redirect to destination
 */
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isDemoMode } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user && !isDemoMode) {
    return <Navigate to="/login" replace />;
  }

  // If already onboarded, forward to default destination
  if (!isDemoMode && user && user.onboardingComplete) {
    const isInst = isInstitutionRole(user.role);
    const destination = isInst ? `/institution/${user.institutionId || 'inst-01'}` : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};

/**
 * Public Only Route (for /login and /register)
 * - If already logged in and profile complete, redirects to user's landing page
 */
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isDemoMode } = useAuth();

  if (loading) return <LoadingScreen />;

  if ((user || isDemoMode) && user?.onboardingComplete !== false) {
    const isInst = user ? isInstitutionRole(user.role) : false;
    const dest = isInst ? `/institution/${user?.institutionId || 'inst-01'}` : '/dashboard';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
};

/**
 * Root Route Handler ('/')
 */
const RootHandler: React.FC = () => {
  const { user, loading, isDemoMode } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user && !isDemoMode) {
    return <LandingPage />;
  }

  if (!isDemoMode && user && user.onboardingComplete === false) {
    return <Navigate to="/select-type" replace />;
  }

  const isInst = user ? isInstitutionRole(user.role) : false;
  const dest = isInst ? `/institution/${user?.institutionId || 'inst-01'}` : '/dashboard';
  return <Navigate to={dest} replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Root: Landing Page or Redirect */}
      <Route path="/" element={<RootHandler />} />

      {/* 2. Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/demo" element={<DemoPage />} />

      {/* 3. First-Login Selection Flow */}
      <Route
        path="/select-type"
        element={
          <OnboardingRoute>
            <SelectTypePage />
          </OnboardingRoute>
        }
      />
      <Route
        path="/aicte/select-role"
        element={
          <OnboardingRoute>
            <AicteSelectRolePage />
          </OnboardingRoute>
        }
      />
      <Route
        path="/institution/select"
        element={
          <OnboardingRoute>
            <InstitutionSelectPage />
          </OnboardingRoute>
        }
      />

      {/* 4. Core Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/:id"
        element={
          <ProtectedRoute>
            <InstitutionProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/:id/vault"
        element={
          <ProtectedRoute>
            <InstitutionVaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fdr/:fdrId"
        element={
          <ProtectedRoute>
            <FDRDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentVault />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:docId"
        element={
          <ProtectedRoute>
            <DocumentViewerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        }
      />

      {/* 5. Additional Workflow Routes */}
      <Route
        path="/fdrs"
        element={
          <ProtectedRoute>
            <FDRList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fdrs/new"
        element={
          <ProtectedRoute>
            <FDRCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institutions"
        element={
          <ProtectedRoute>
            <Institutions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institutions/new"
        element={
          <ProtectedRoute>
            <RegisterInstitution />
          </ProtectedRoute>
        }
      />
      <Route
        path="/release"
        element={
          <ProtectedRoute>
            <ReleaseRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clearances"
        element={
          <ProtectedRoute>
            <ClearanceMatrixPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maturity"
        element={
          <ProtectedRoute>
            <MaturityCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/policy"
        element={
          <ProtectedRoute>
            <PolicyConfigPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/system"
        element={
          <ProtectedRoute>
            <SystemSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Aliases for backwards compatibility */}
      <Route path="/vault" element={<Navigate to="/documents" replace />} />
      <Route path="/audit" element={<Navigate to="/audit-log" replace />} />
      <Route path="/admin/access-requests" element={<Navigate to="/admin/users" replace />} />
      <Route path="/admin/policy" element={<Navigate to="/policy" replace />} />

      {/* 6. 404 Not Found Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SystemDateProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SystemDateProvider>
    </AuthProvider>
  );
}
