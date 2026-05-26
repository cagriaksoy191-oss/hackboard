/**
 * StatMetric — Molecule
 * Large number + label + optional trend indicator
 * Used in dashboard stat cards
 */
import React from 'react';

export default function StatMetric({
  value,
  label,
  trend,
  trendValue,
  icon,
  accent = false,
  className = '',
}) {
  const trendColor = trend === 'up'
    ? 'text-[var(--accent-success)]'
    : trend === 'down'
    ? 'text-[var(--accent-danger)]'
    : 'text-[var(--text-tertiary)]';

  const trendIcon = trend === 'up'
    ? '↑'
    : trend === 'down'
    ? '↓'
    : '';

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {icon && (
        <div className="text-[var(--text-tertiary)] mb-1">
          {icon}
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <span
          className={`
            text-2xl font-bold tracking-tight leading-none
            ${accent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}
          `.trim().replace(/\s+/g, ' ')}
        >
          {value}
        </span>
        {trendValue && (
          <span className={`text-[11px] font-medium ${trendColor}`}>
            {trendIcon} {trendValue}
          </span>
        )}
      </div>
      <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
