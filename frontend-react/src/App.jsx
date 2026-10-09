import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
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
import VerifyPage from './pages/verifier/VerifyPage.jsx';
import ResultPage from './pages/verifier/ResultPage.jsx';
import PublicVerify from './pages/public/PublicVerify.jsx';
import IssuerDirectory from './pages/public/IssuerDirectory.jsx';
import AuditLog from './pages/admin/AuditLog.jsx';
import FullScreenLoader from './components/FullScreenLoader.jsx';

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader label="Restoring your session" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(user.role)) return <Navigate to={user.role === 'issuer' ? '/issuer' : '/verify'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* public routes — no chrome, no login */}
      <Route path="/public/verify/:docId" element={<PublicVerify />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
          path="/issuer/documents"
          element={
            <RequireRole roles={['issuer']}>
              <MyDocuments />
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
          path="/issuer/studio"
          element={
            <RequireRole roles={['issuer']}>
              <TemplateStudio />
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
  );
}
