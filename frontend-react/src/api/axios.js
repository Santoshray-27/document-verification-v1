// Single axios instance. Same-origin /api by default so it works behind any host/tunnel.
import axios from 'axios';

export const TOKEN_KEY = 'agnitia.token';
export const USER_KEY = 'agnitia.user';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    if (status === 401 && code !== 'INVALID_CREDENTIALS') {
      // token expired or revoked — drop the session so the guard redirects to login
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (!window.location.pathname.startsWith('/public') && window.location.pathname !== '/login') {
        window.location.assign('/login?expired=1');
      }
    }
    return Promise.reject(error);
  }
);

/** Human-readable message for any axios error. */
export function errMsg(e, fallback = 'Something went wrong') {
  return e?.response?.data?.error?.message || e?.message || fallback;
}

/** Turn any URL into one that resolves against the API origin (for /static assets). */
export function assetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = import.meta.env.VITE_API_BASE_URL || '';
  if (!base || base === '/api') return path; // same origin
  return base.replace(/\/api\/?$/, '') + path;
}

export default api;
