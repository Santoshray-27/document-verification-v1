import { motion } from 'framer-motion';
import Logo from './Logo.jsx';

export default function FullScreenLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <Logo size={44} />
      <div className="flex items-center gap-2.5 text-sm text-slate-400">
        <motion.span
          className="h-3.5 w-3.5 rounded-full border-2 border-gold-400/30 border-t-gold-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />
        {label}
      </div>
    </div>
  );
}
