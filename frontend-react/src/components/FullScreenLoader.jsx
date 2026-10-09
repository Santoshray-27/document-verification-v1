import React from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo.jsx';

export default function FullScreenLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
      <Logo size={44} animate={true} />
      <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
        <motion.span
          className="h-4 w-4 rounded-full border-2 border-amber-500/30 border-t-amber-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
        />
        {label}
      </div>
    </div>
  );
}
