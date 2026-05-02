import React from 'react';
import { motion } from 'framer-motion';

function ChatMessage({ msg, isMe, user, formatTime, index }) {
  return (
    <motion.div
      key={msg.id || index}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
        {!isMe && (
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-accentAlt"
            style={user?.avatar_color ? { backgroundColor: user.avatar_color } : undefined}
          >
            {user?.name?.[0] || '?'}
          </div>
        )}
        <div className={`px-4 py-2.5 rounded-2xl border ${
          isMe
            ? 'bg-gradient-to-r from-accent to-accentAlt text-white border-transparent rounded-br-md'
            : 'surface-bg border-theme-subtle text-primary rounded-bl-md'
        }`}>
          {!isMe && (
            <p className="text-xs font-semibold mb-1 opacity-70">{user?.name || 'Bilinmeyen'}</p>
          )}
          <p className="text-sm">{msg.content}</p>
          <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-muted'}`}>
            {formatTime(msg.created_at)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default ChatMessage;
