import React from 'react';
import { motion } from 'framer-motion';

function TypingIndicator({ typingUsers, getUserById }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 text-muted text-sm"
    >
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {typingUsers.map((id) => getUserById(id)?.name).filter(Boolean).join(', ')} yaziyor...
      </span>
    </motion.div>
  );
}

export default TypingIndicator;
