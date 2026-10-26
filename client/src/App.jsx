import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/GlobalStateContext';

// Lazy Load All Master Screens
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthSuite = lazy(() => import('./pages/AuthSuite'));
const DonorDashboard = lazy(() => import('./pages/DonorDashboard'));
const NgoConsole = lazy(() => import('./pages/NgoConsole'));
const AdminConsole = lazy(() => import('./pages/AdminConsole'));
const SearchDirectory = lazy(() => import('./pages/SearchDirectory'));
const NgoProfile = lazy(() => import('./pages/NgoProfile'));
const RequestWizard = lazy(() => import('./pages/RequestWizard'));
const SmartMatchVisualizer = lazy(() => import('./pages/SmartMatchVisualizer'));
const ChatTerminal = lazy(() => import('./pages/ChatTerminal'));
const LogisticsTracking = lazy(() => import('./pages/LogisticsTracking'));
const ImpactAnalytics = lazy(() => import('./pages/ImpactAnalytics'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const SettingsTerminal = lazy(() => import('./pages/SettingsTerminal'));

// Lazy Load Informational Pages
const Bridge = lazy(() => import('./pages/Bridge'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const BrandIdentity = lazy(() => import('./pages/BrandIdentity'));
const NotFound = lazy(() => import('./pages/NotFound'));
const NgoRegister = lazy(() => import('./pages/NgoRegister'));

// Role-Based Access Control Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    if (window.location.pathname.includes('admin')) {
      return <Navigate to="/auth?tab=login&role=admin" replace />;
    }
    const isNgoTarget = window.location.pathname.includes('ngo');
    return <Navigate to={isNgoTarget ? "/auth?tab=register&role=ngo" : "/auth"} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'ngo') return <Navigate to="/ngo" replace />;
    return <Navigate to="/donor" replace />;
  }

  return children;
};

const RedirectToDjangoAdmin = () => {
  React.useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${backendUrl}/admin/`;
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F0EA]">
      <div className="text-[#666157] animate-pulse font-serif text-lg">Redirecting to Django Admin Console...</div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F3F0EA]">
          <div className="w-8 h-8 border-4 border-[#DCD4C8] border-t-[#1C1B18] rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
        {/* Screen 1: Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Screen 2: Authentication Core Suite */}
        <Route path="/auth" element={<AuthSuite />} />
        <Route path="/login" element={<AuthSuite />} />
        <Route path="/register" element={<AuthSuite />} />

        {/* New NGO Registration Wizard */}
        <Route 
          path="/ngo-register" 
          element={
            <ProtectedRoute allowedRoles={['ngo']}>
              <NgoRegister />
            </ProtectedRoute>
          } 
        />

        {/* Screen 6: Discover Directory */}
        <Route path="/discover" element={<SearchDirectory />} />
        <Route path="/search" element={<Navigate to="/discover" replace />} />

        {/* Screen 7: NGO Public Profile */}
        <Route path="/ngo/:id" element={<NgoProfile />} />

        {/* Screen 12: Public Impact Analytics Dashboard */}
        <Route path="/impact" element={<ImpactAnalytics />} />

        {/* Screen 11: End-to-End Logistical Tracking Stream */}
        <Route path="/tracking/:id" element={<LogisticsTracking />} />

        {/* New Public Pages */}
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/brand" element={<BrandIdentity />} />

        {/* --- PROTECTED ROUTES --- */}

        {/* Screen 3: The Donor Dashboard Workspace (Donor Only) */}
        <Route
          path="/donor"
          element={
            <ProtectedRoute allowedRoles={['donor']}>
              <DonorDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/donor-dashboard" element={<Navigate to="/donor" replace />} />

        {/* Screen 4: NGO Control Console (NGO Only) */}
        <Route
          path="/ngo"
          element={
            <ProtectedRoute allowedRoles={['ngo']}>
              <NgoConsole />
            </ProtectedRoute>
          }
        />
        <Route path="/ngo-dashboard" element={<Navigate to="/ngo" replace />} />
        <Route path="/ngo-console" element={<Navigate to="/ngo" replace />} />
        <Route path="/donor-hub" element={<Navigate to="/donor" replace />} />

        {/* Screen 5: Platform Integrity Control Center (Admin Only) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminConsole />
            </ProtectedRoute>
          }
        />
        <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />

        {/* Screen 8: Donation Request Logistics Wizard (Donor Only) */}
        <Route
          path="/request-wizard"
          element={
            <ProtectedRoute allowedRoles={['donor']}>
              <RequestWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload-donation"
          element={
            <ProtectedRoute allowedRoles={['donor']}>
              <RequestWizard />
            </ProtectedRoute>
          }
        />

        {/* Screen 9: Smart Matching Recommendation Visualizer */}
        <Route
          path="/smart-match"
          element={
            <ProtectedRoute allowedRoles={['donor', 'ngo', 'admin']}>
              <SmartMatchVisualizer />
            </ProtectedRoute>
          }
        />

        {/* Screen 10: Reactive Communication Core */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatTerminal />
            </ProtectedRoute>
          }
        />

        {/* Screen 13: System Notification Center */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationCenter />
            </ProtectedRoute>
          }
        />

        {/* Screen 14: User Identity Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />

        {/* Screen 15: Global settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsTerminal />
            </ProtectedRoute>
          }
        />

        {/* Custom 404 Wildcard Page */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
