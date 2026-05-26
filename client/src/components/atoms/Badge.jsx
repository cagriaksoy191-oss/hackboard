/**
 * Badge — Atom
 * Status, priority, tag display
 * Dot indicator + subtle background tinting
 */
import React from 'react';

const presets = {
  // Priority
  critical: { bg: 'bg-red-500/12', text: 'text-red-400', dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-500/12', text: 'text-orange-400', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-yellow-500/12', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  low:      { bg: 'bg-green-500/12', text: 'text-green-400', dot: 'bg-green-500' },
  // Status
  active:   { bg: 'bg-green-500/12', text: 'text-green-400', dot: 'bg-green-500' },
  inactive: { bg: 'bg-slate-500/12', text: 'text-slate-400', dot: 'bg-slate-500' },
  pending:  { bg: 'bg-yellow-500/12', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  // General
  default:  { bg: 'bg-slate-500/10', text: 'text-slate-300', dot: 'bg-slate-400' },
  primary:  { bg: 'bg-indigo-500/12', text: 'text-indigo-400', dot: 'bg-indigo-500' },
  success:  { bg: 'bg-emerald-500/12', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  warning:  { bg: 'bg-amber-500/12', text: 'text-amber-400', dot: 'bg-amber-500' },
  danger:   { bg: 'bg-red-500/12', text: 'text-red-400', dot: 'bg-red-500' },
  info:     { bg: 'bg-blue-500/12', text: 'text-blue-400', dot: 'bg-blue-500' },
};

const sizes = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1',
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  removable = false,
  onRemove,
  color,
  className = '',
}) {
  const preset = presets[variant] || presets.default;
  const s = sizes[size] || sizes.sm;

  // Custom color override
  const customStyle = color ? {
    backgroundColor: `${color}18`,
    color: color,
  } : {};

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-md
        select-none whitespace-nowrap leading-none
        ${color ? '' : `${preset.bg} ${preset.text}`}
        ${s} ${className}
      `.trim().replace(/\s+/g, ' ')}
      style={customStyle}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color ? '' : preset.dot}`}
          style={color ? { backgroundColor: color } : {}}
        />
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity duration-100"
          aria-label="Remove"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
