import React from 'react';
import { motion } from 'framer-motion';

function EmptyState({ message, icon = 'task' }) {
  const icons = {
    task: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    search: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    chat: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 glass max-w-sm mx-auto text-center shadow-[var(--shadow-sm)]"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="mb-4 text-[var(--accent-primary)] opacity-90"
      >
        <div className="w-14 h-14 rounded-full bg-[var(--accent-primary-subtle)] flex items-center justify-center border border-[var(--accent-primary)]/10 shadow-[var(--shadow-sm)]">
          {icons[icon] || icons.task}
        </div>
      </motion.div>
      <p className="text-[13px] font-medium text-[var(--text-secondary)] leading-relaxed">{message}</p>
    </motion.div>
  );
}

export default EmptyState;
