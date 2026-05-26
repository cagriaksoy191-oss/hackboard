/**
 * ActivityItem — Organism
 * Single activity feed item with action icon, user, details, timestamp
 * Apple-style minimal list item
 */
import React from 'react';
import Avatar from '../atoms/Avatar';

const actionIcons = {
  completed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  created: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 4v16m8-8H4" />
    </svg>
  ),
  moved: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  deleted: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 3h4" />
    </svg>
  ),
  updated: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4v5h5M20 20v-5h-5" />
      <path d="M20.49 9A9 9 0 005.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 013.51 15" />
    </svg>
  ),
  commented: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
};

const actionColors = {
  completed: 'text-[var(--accent-success)] bg-[var(--accent-success-muted)]',
  created:   'text-[var(--accent-primary)] bg-[var(--accent-primary-muted)]',
  moved:     'text-[var(--accent-warning)] bg-[var(--accent-warning-muted)]',
  deleted:   'text-[var(--accent-danger)] bg-[var(--accent-danger-muted)]',
  updated:   'text-[var(--accent-info)] bg-[var(--accent-info-muted)]',
  commented: 'text-[var(--text-tertiary)] bg-[var(--interactive-muted)]',
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}s önce`;
  return `${Math.floor(diff / 86400)}g önce`;
}

export default function ActivityItem({
  activity,
  compact = false,
  className = '',
}) {
  const action = activity.action || 'updated';
  const icon = actionIcons[action] || actionIcons.updated;
  const colorClass = actionColors[action] || actionColors.updated;

  return (
    <div
      className={`
        flex items-start gap-3
        rounded-lg
        hover:bg-[var(--interactive-hover)]
        transition-colors duration-150 ease-[var(--ease-apple)]
        ${compact ? 'p-2' : 'p-3'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Action Icon */}
      <div className={`
        w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center
        ${colorClass}
      `.trim().replace(/\s+/g, ' ')}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-semibold">{activity.name || 'Sistem'}</span>
          <span className="text-[var(--text-tertiary)]"> {action}</span>
        </p>
        {activity.details && (
          <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
            {activity.details}
          </p>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          {formatRelativeTime(activity.created_at)}
        </p>
      </div>
    </div>
  );
}
