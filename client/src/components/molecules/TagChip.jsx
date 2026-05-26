/**
 * TagChip — Molecule
 * Color dot + Tag name, with optional remove button
 */
import React from 'react';

export default function TagChip({
  name,
  color = '#6366f1',
  removable = false,
  onRemove,
  size = 'sm',
  className = '',
  onClick,
}) {
  const sizes = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const s = sizes[size] || sizes.sm;
  const Comp = onClick ? 'button' : 'span';

  return (
    <Comp
      className={`
        inline-flex items-center font-medium rounded-md
        select-none whitespace-nowrap leading-none
        bg-[var(--interactive-muted)] text-[var(--text-secondary)]
        ${onClick ? 'cursor-pointer hover:bg-[var(--interactive-hover)] transition-colors duration-100' : ''}
        ${s} ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="ml-0.5 hover:text-[var(--text-primary)] transition-colors duration-100"
          aria-label={`Remove ${name}`}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </Comp>
  );
}
