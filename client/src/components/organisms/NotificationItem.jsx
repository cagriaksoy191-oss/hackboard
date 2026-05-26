/**
 * NotificationItem — Organism (Upgraded)
 * Single notification with type icon, message, time, and read state
 */
import React from 'react';

const typeIcons = {
  message: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  task: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  mention: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-4 8" />
    </svg>
  ),
  system: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
};

const typeColors = {
  message: 'text-[var(--accent-info)] bg-[var(--accent-info-muted)]',
  task:    'text-[var(--accent-success)] bg-[var(--accent-success-muted)]',
  mention: 'text-[var(--accent-warning)] bg-[var(--accent-warning-muted)]',
  system:  'text-[var(--text-tertiary)] bg-[var(--interactive-muted)]',
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}s`;
  return `${Math.floor(diff / 86400)}g`;
}

export default function NotificationItem({
  notification,
  onClick,
  className = '',
}) {
  const type = notification.type || 'system';
  const icon = typeIcons[type] || typeIcons.system;
  const colorClass = typeColors[type] || typeColors.system;
  const isRead = notification.read;

  return (
    <button
      onClick={() => onClick?.(notification)}
      className={`
        w-full flex items-start gap-3 p-3 rounded-lg text-left
        transition-colors duration-150 ease-[var(--ease-apple)]
        hover:bg-[var(--interactive-hover)]
        ${!isRead ? 'bg-[var(--accent-primary-subtle)]' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Icon */}
      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${colorClass}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {notification.title && (
          <p className={`text-[12px] font-semibold leading-snug ${!isRead ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
            {notification.title}
          </p>
        )}
        <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
          {notification.message}
        </p>
      </div>

      {/* Time + Unread dot */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-[var(--text-muted)]">
          {formatRelativeTime(notification.created_at)}
        </span>
        {!isRead && (
          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
        )}
      </div>
    </button>
  );
}
