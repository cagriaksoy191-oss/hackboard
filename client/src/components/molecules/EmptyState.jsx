/**
 * EmptyState — Molecule (Upgraded)
 * Icon + Message + optional CTA button
 * Apple-style minimal empty state
 */
import React from 'react';
import Button from '../atoms/Button';

export default function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  compact = false,
  className = '',
}) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${compact ? 'py-8 px-4 gap-3' : 'py-16 px-6 gap-4'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {icon && (
        <div className={`
          flex items-center justify-center rounded-2xl
          bg-[var(--interactive-muted)]
          ${compact ? 'w-10 h-10' : 'w-14 h-14'}
          text-[var(--text-tertiary)]
        `.trim().replace(/\s+/g, ' ')}>
          {icon}
        </div>
      )}
      {title && (
        <h3
          className={`
            font-semibold text-[var(--text-primary)]
            ${compact ? 'text-sm' : 'text-base'}
          `.trim().replace(/\s+/g, ' ')}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          className={`
            text-[var(--text-tertiary)] max-w-xs leading-relaxed
            ${compact ? 'text-xs' : 'text-sm'}
          `.trim().replace(/\s+/g, ' ')}
        >
          {description}
        </p>
      )}
      {(action || onAction) && (
        <Button
          variant="secondary"
          size={compact ? 'sm' : 'md'}
          onClick={onAction}
          className="mt-1"
        >
          {actionLabel || action || 'Get started'}
        </Button>
      )}
    </div>
  );
}
