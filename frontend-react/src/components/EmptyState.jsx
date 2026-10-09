import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass flex flex-col items-center px-6 py-14 text-center"
    >
      {Icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
          <Icon size={24} />
        </span>
      )}
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {body && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-400">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
