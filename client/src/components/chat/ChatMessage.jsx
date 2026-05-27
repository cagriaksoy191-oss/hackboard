import React from 'react';
import { motion } from 'framer-motion';
import Avatar from '../atoms/Avatar';

function ChatMessage({ msg, isMe, user, formatTime, index }) {
  const name = user?.name || msg.name || 'Anonim';
  const color = user?.avatar_color || msg.avatar_color || '#6366f1';

  return (
    <motion.div
      key={msg.id || index}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
        {!isMe && (
          <Avatar name={name} color={color} size="sm" />
        )}
        <div className={`
          px-3.5 py-2.5 min-w-[100px]
          ${isMe
            ? 'bg-[var(--accent-primary)] text-white rounded-2xl rounded-tr-md'
            : 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] rounded-2xl rounded-tl-md'
          }
        `.trim().replace(/\s+/g, ' ')}>
          {!isMe && (
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              {name}
            </p>
          )}
          <p className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words ${isMe ? 'text-white/95' : ''}`}>
            {msg.content}
          </p>
          <p className={`text-[10px] mt-1.5 ${isMe ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
            {formatTime(msg.created_at)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default ChatMessage;
