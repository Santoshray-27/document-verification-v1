import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const TOAST_STYLES = {
  success: 'border-emerald-500/30 bg-emerald-50/95 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-100 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400',
  error: 'border-rose-500/30 bg-rose-50/95 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 [&_svg]:text-rose-600 dark:[&_svg]:text-rose-400',
  warning: 'border-amber-500/30 bg-amber-50/95 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400',
  info: 'border-stone-300 dark:border-stone-700 bg-stone-50/95 dark:bg-stone-900/90 text-stone-900 dark:text-stone-100 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, type = 'info', ttl = 4200) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      if (ttl) setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error', 6000),
      warning: (m) => push(m, 'warning', 5200),
      info: (m) => push(m, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                role="status"
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl ${
                  TOAST_STYLES[t.type] || TOAST_STYLES.info
                }`}
              >
                <Icon size={18} className="mt-0.5 shrink-0" />
                <p className="flex-1 leading-snug font-medium text-xs sm:text-sm">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="shrink-0 opacity-60 transition hover:opacity-100 p-0.5 rounded"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
