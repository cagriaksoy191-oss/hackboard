/**
 * MilestoneNode — Organism
 * Milestone display with status indicator, title, date, links
 */
import React from 'react';

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const FlagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22v-7" />
  </svg>
);

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MilestoneNode({
  milestone,
  onClick,
  className = '',
}) {
  const isCompleted = milestone.is_completed;
  const isPast = milestone.target_time && new Date(milestone.target_time) < new Date();

  return (
    <button
      onClick={() => onClick?.(milestone)}
      className={`
        w-full flex items-start gap-3 p-4 rounded-xl text-left
        border transition-all duration-200 ease-[var(--ease-apple)]
        hover:shadow-[var(--shadow-md)]
        ${isCompleted
          ? 'bg-[var(--accent-success-muted)] border-[var(--accent-success)]/20'
          : isPast
            ? 'bg-[var(--accent-danger-muted)] border-[var(--accent-danger)]/20'
            : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--border-strong)]'
        }
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Status Icon */}
      <div className={`
        w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
        ${isCompleted
          ? 'bg-[var(--accent-success)] text-white'
          : isPast
            ? 'bg-[var(--accent-danger)] text-white'
            : 'bg-[var(--interactive-muted)] text-[var(--text-tertiary)]'
        }
      `.trim().replace(/\s+/g, ' ')}>
        {isCompleted ? <CheckIcon /> : <FlagIcon />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={`
          text-[13px] font-semibold leading-snug
          ${isCompleted ? 'text-[var(--accent-success)] line-through opacity-80' : 'text-[var(--text-primary)]'}
        `.trim().replace(/\s+/g, ' ')}>
          {milestone.title}
        </h4>
        {milestone.description && (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1 line-clamp-2">
            {milestone.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {formatDate(milestone.target_time)}
          </span>
        </div>
      </div>
    </button>
  );
}
