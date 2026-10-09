import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY, USER_KEY } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [workerOnline, setWorkerOnline] = useState(true);

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
          setUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        if (alive) setUser(null);
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
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, workerOnline, isIssuer: user?.role === 'issuer', isAdmin: user?.role === 'admin' }),
    [user, loading, login, logout, workerOnline]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
