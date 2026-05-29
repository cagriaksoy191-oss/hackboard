import React from 'react';
import { motion } from 'framer-motion';

function TypingIndicator({ typingUsers, getUserById }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] px-1"
    >
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {typingUsers.map((id) => getUserById(id)?.name).filter(Boolean).join(', ')} yazıyor...
      </span>
    </motion.div>
  );
}

export default TypingIndicator;
