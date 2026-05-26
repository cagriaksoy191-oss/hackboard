/**
 * ChatMessage — Organism
 * Single chat message with avatar, content, timestamp, thread support
 * Apple Messages inspired clean layout
 */
import React from 'react';
import Avatar from '../atoms/Avatar';

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessage({
  message,
  isOwn = false,
  showAvatar = true,
  onThreadClick,
  threadCount = 0,
  className = '',
}) {
  const name = message.name || message.user_name || 'Anonim';
  const color = message.avatar_color || '#6366f1';

  return (
    <div
      className={`
        group flex items-start gap-2.5
        ${isOwn ? 'flex-row-reverse' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Avatar */}
      {showAvatar ? (
        <Avatar name={name} color={color} size="sm" />
      ) : (
        <div className="w-7 flex-shrink-0" />
      )}

      {/* Bubble */}
      <div className={`
        max-w-[75%] min-w-[120px]
        ${isOwn
          ? 'bg-[var(--accent-primary)] text-white rounded-2xl rounded-tr-md'
          : 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] rounded-2xl rounded-tl-md'
        }
        px-3.5 py-2.5
      `.trim().replace(/\s+/g, ' ')}>
        {/* Sender Name (not for own messages) */}
        {!isOwn && showAvatar && (
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
            {name}
          </p>
        )}

        {/* Content */}
        <p className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words ${isOwn ? 'text-white/95' : ''}`}>
          {message.content}
        </p>

        {/* Footer: time + thread */}
        <div className={`
          flex items-center justify-between mt-1.5 gap-3
          ${isOwn ? 'text-white/50' : 'text-[var(--text-muted)]'}
        `.trim().replace(/\s+/g, ' ')}>
          <span className="text-[10px]">{formatTime(message.created_at)}</span>

          {onThreadClick && (
            <button
              onClick={() => onThreadClick(message)}
              className={`
                text-[10px] font-medium
                opacity-0 group-hover:opacity-100
                transition-opacity duration-150
                ${isOwn ? 'text-white/60 hover:text-white/90' : 'text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]'}
              `.trim().replace(/\s+/g, ' ')}
            >
              {threadCount > 0 ? `${threadCount} yanıt` : 'Yanıtla'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
