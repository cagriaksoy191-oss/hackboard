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
    <div className="border-t border-[var(--border-subtle)] p-3 sm:p-4 shrink-0 bg-[var(--bg-surface)]/80 backdrop-blur-xl z-10 relative">
      {/* Emoji Picker */}
      {showEmoji && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-wrap gap-1.5 mb-3 p-3 bg-[var(--bg-surface-3)] border border-[var(--border-subtle)] rounded-xl max-h-32 overflow-y-auto"
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="text-lg hover:scale-125 transition-transform duration-100 p-1 rounded-md hover:bg-[var(--interactive-hover)]"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          aria-label="Emoji Seçici"
          title="Emoji Seçici"
          className={`
            p-2.5 rounded-xl border transition-all duration-150 ease-[var(--ease-apple)]
            ${showEmoji
              ? 'bg-[var(--accent-primary-muted)] border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'bg-[var(--interactive-muted)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--interactive-hover)]'
            }
          `.trim().replace(/\s+/g, ' ')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
        </button>

        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Mesaj yaz..."
          className="
            flex-1 px-4 py-2.5 rounded-xl text-[13px]
            bg-[var(--bg-input)] border border-[var(--border-input)]
            text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
            focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)]
            transition-all duration-150 ease-[var(--ease-apple)]
          "
        />

        <button
          type="submit"
          aria-label="Mesaj Gönder"
          title="Mesaj Gönder"
          className="
            p-2.5 rounded-xl
            bg-[var(--accent-primary)] text-white
            hover:bg-[var(--accent-primary-hover)]
            active:scale-95
            transition-all duration-150 ease-[var(--ease-apple)]
            shadow-[var(--shadow-accent)]
          "
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default ChatInput;
