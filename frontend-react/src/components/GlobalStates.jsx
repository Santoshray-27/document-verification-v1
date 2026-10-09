import React, { useEffect, useState } from 'react';
import { WifiOff, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function GlobalStates() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Add Axios interceptor for 401 Session Expired
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
          setSessionExpired(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {offline && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-rose-600 text-bg py-2 flex items-center justify-center gap-3 font-mono text-[10px] uppercase font-bold tracking-widest"
          >
            <WifiOff size={14} /> Network Connection Lost. Operating in degraded mode.
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionExpired && (
          <div className="fixed inset-0 z-[9999] bg-ink/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface border border-line shadow-hard max-w-sm w-full p-8 text-center"
            >
               <LogOut size={48} className="mx-auto text-amber-500 mb-6" />
               <h2 className="font-display text-2xl text-ink mb-2">Session Expired</h2>
               <p className="font-mono text-[10px] text-ink-muted mb-8 leading-relaxed">
                 For security reasons, your active session has been terminated. Please re-authenticate to continue using the console.
               </p>
               <button 
                 onClick={() => {
                   setSessionExpired(false);
                   logout();
                 }}
                 className="w-full py-3 bg-ink text-bg font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-ink/90 transition-colors"
               >
                 Acknowledge & Login
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
