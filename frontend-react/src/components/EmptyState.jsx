import React from 'react';
import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center shadow-xs"
    >
      {Icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50 text-muted-foreground ring-1 ring-border/40">
          <Icon size={24} />
        </span>
      )}
      <h3 className="font-display text-base font-semibold text-foreground tracking-tight">{title}</h3>
      {body && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
