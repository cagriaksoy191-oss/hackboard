import React from 'react';
import { motion } from 'framer-motion';

function ChatInput({
  newMessage,
  showEmoji,
  setShowEmoji,
  handleSend,
  handleTyping,
  addEmoji,
  emojis
}) {
  return (
    <div className="border-t border-theme p-3 sm:p-4 shrink-0 bg-surface/80 backdrop-blur-md z-10 relative">
      {showEmoji && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 mb-3 p-3 surface-bg border border-theme-subtle rounded-xl max-h-40 overflow-y-auto"
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="text-xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          aria-label="Emoji Secici"
          title="Emoji Secici"
          className="p-2.5 rounded-xl surface-bg border border-theme-subtle hover-surface-bg-hover text-secondary hover:text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Mesaj yaz..."
          className="flex-1 px-4 py-2.5 input-surface border rounded-xl text-sm focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          aria-label="Mesaj Gonder"
          title="Mesaj Gonder"
          className="p-2.5 rounded-xl bg-gradient-to-r from-accent to-accentAlt text-white hover:opacity-90 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default ChatInput;
