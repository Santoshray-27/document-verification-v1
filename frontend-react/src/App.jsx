import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useEffect, useState } from 'react';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';
import Dashboard from './pages/issuer/Dashboard.jsx';
import IssueDocument from './pages/issuer/IssueDocument.jsx';
import MyDocuments from './pages/issuer/MyDocuments.jsx';
import Settings from './pages/issuer/Settings.jsx';
import TemplateStudio from './pages/issuer/TemplateStudio.jsx';
import BulkIssuance from './pages/issuer/BulkIssuance.jsx';
import VerifyPage from './pages/verifier/VerifyPage.jsx';
import ResultPage from './pages/verifier/ResultPage.jsx';
import PublicVerify from './pages/public/PublicVerify.jsx';
import IssuerDirectory from './pages/public/IssuerDirectory.jsx';
import AuditLog from './pages/admin/AuditLog.jsx';
import Settings from './pages/issuer/Settings.jsx';
import BulkIssuance from './pages/issuer/BulkIssuance.jsx';
import Reports from './pages/issuer/Reports.jsx';
import FullScreenLoader from './components/FullScreenLoader.jsx';
import GlobalStates from './components/GlobalStates.jsx';
import LandingPage from './pages/landing/LandingPage.jsx';
import ApiCheck from './pages/dev/ApiCheck.jsx';

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader label="Restoring your session" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(user.role)) return <Navigate to={user.role === 'issuer' ? '/issuer' : '/verify'} replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to={user.role === 'issuer' ? '/issuer' : '/verify'} replace />;
  return children;
}

function SessionModal() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === '1';
  const [open, setOpen] = useState(isExpired);

  useEffect(() => {
    if (isExpired && !open) {
      setOpen(true);
    }
  }, [isExpired]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border border-line rounded-xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-bold font-display text-foreground mb-2">Session Expired</h3>
        <p className="text-sm text-muted-foreground mb-6">Your security session has expired. Please log in again to continue.</p>
        <button 
          onClick={() => {
            setOpen(false);
            navigate('/login', { replace: true });
          }}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-md py-2.5 transition-colors"
        >
          Log In
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <GlobalStates />
      <SessionModal />
      <Routes>
      {/* public routes — no chrome, no login */}
      <Route path="/public/verify/:docId" element={<PublicVerify />} />

      {/* NEW: premium landing page — own navbar+footer, redirects logged-in users */}
      <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />

      {/* Dev only */}
      {!import.meta.env.PROD && <Route path="/dev/api-check" element={<ApiCheck />} />}

      <Route element={<Layout />}>
        {/* /home kept as alias so the old Landing.jsx is still accessible if needed */}
        <Route path="/home" element={<Landing />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/issuers" element={<IssuerDirectory />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/result/:jobId" element={<ResultPage />} />
        <Route
          path="/issuer"
          element={
            <RequireRole roles={['issuer']}>
              <Dashboard />
            </RequireRole>
          }
        />
        <Route
          path="/issuer/issue"
          element={
            <RequireRole roles={['issuer']}>
              <IssueDocument />
            </RequireRole>
          }
        />
        <Route
          path="/issuer/bulk"
          element={
            <RequireRole roles={['issuer']}>
              <BulkIssuance />
            </RequireRole>
          }
        />
        <Route
          path="/issuer/documents"
          element={
            <RequireRole roles={['issuer']}>
              <MyDocuments />
            </RequireRole>
          }
        />
        <Route
          path="/issuer/documents/:docId"
          element={
            <RequireRole roles={['issuer']}>
              <MyDocuments />
            </RequireRole>
          }
        />
        <Route
          path="/issuer/reports"
          element={
            <RequireRole roles={['issuer']}>
              <Reports />
            </RequireRole>
          }
        />
        <Route
          path="/issuer/settings"
          element={
            <RequireRole roles={['issuer']}>
              <Settings />
            </RequireRole>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireRole roles={['issuer', 'admin']}>
              <Settings />
            </RequireRole>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RequireRole roles={['admin']}>
              <AuditLog />
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  );
}
