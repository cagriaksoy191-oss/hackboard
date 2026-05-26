/**
 * SprintCard — Organism
 * Sprint overview card with progress, dates, and task count
 */
import React from 'react';
import Badge from '../atoms/Badge';

const statusMap = {
  planning:  { variant: 'pending',  label: 'Planlama' },
  active:    { variant: 'active',   label: 'Aktif' },
  completed: { variant: 'success',  label: 'Tamamlandı' },
  cancelled: { variant: 'inactive', label: 'İptal' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function SprintCard({
  sprint,
  taskCount = 0,
  completedCount = 0,
  onClick,
  isActive = false,
  className = '',
}) {
  const status = statusMap[sprint.status] || statusMap.planning;
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl p-4
        border transition-all duration-200 ease-[var(--ease-apple)]
        hover:shadow-[var(--shadow-md)]
        ${isActive
          ? 'bg-[var(--accent-primary-subtle)] border-[var(--accent-primary)] shadow-[var(--shadow-accent)]'
          : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--border-strong)]'
        }
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug flex-1">
          {sprint.name || sprint.title}
        </h4>
        <Badge variant={status.variant} size="xs" dot>
          {status.label}
        </Badge>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] mb-3">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>{formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}</span>
      </div>

      {/* Progress */}
      <div className="mb-2">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-[var(--text-tertiary)]">İlerleme</span>
          <span className="font-medium text-[var(--text-secondary)]">{progress}%</span>
        </div>
        <div className="w-full h-1 bg-[var(--interactive-muted)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500 ease-[var(--ease-apple)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>{completedCount}/{taskCount} görev</span>
        {sprint.goal && (
          <span className="truncate max-w-[60%] text-right">{sprint.goal}</span>
        )}
      </div>
    </button>
  );
}
