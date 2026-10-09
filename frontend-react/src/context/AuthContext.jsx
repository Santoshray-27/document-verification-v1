import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY, USER_KEY } from '../api/axios';
import { mapUser } from '../api/mappers';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    return !!token && !storedUser;
  });
  const [workerOnline, setWorkerOnline] = useState(true);

  // Multi-tab sync
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === TOKEN_KEY) {
        if (!e.newValue) {
          // Token removed in another tab
          setUser(null);
        } else {
          // Token changed/added in another tab
          const storedUser = localStorage.getItem(USER_KEY);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (err) {}
          }
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // restore/validate the session on boot
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (alive) setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (alive) {
          const mapped = mapUser(data.user);
          setUser(mapped);
          localStorage.setItem(USER_KEY, JSON.stringify(mapped));
        }
      } catch (err) {
        // Only drop session if 401, not network errors
        if (err?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          if (alive) setUser(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // worker health poll — drives the "forensics offline" banner
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await api.get('/health');
        if (alive) setWorkerOnline(!!data.worker);
      } catch {
        if (alive) setWorkerOnline(false);
      }
    };
    check();
    const t = setInterval(check, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const mapped = mapUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(mapped));
    setUser(mapped);
    return mapped;
  }, []);

  const register = useCallback(async (name, email, password, orgType) => {
    const { data } = await api.post('/auth/register', { name, email, password, org_type: orgType });
    const mapped = mapUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(mapped));
    setUser(mapped);
    return mapped;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ 
      user, 
      loading, 
      login, 
      logout, 
      register, 
      workerOnline, 
      isAuthenticated: !!user,
      isIssuer: user?.role === 'issuer', 
      isAdmin: user?.role === 'admin' 
    }),
    [user, loading, login, logout, register, workerOnline]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
