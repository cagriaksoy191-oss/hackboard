/**
 * Button — Atom
 * Primary, secondary, ghost, danger variants
 * Apple-style minimal with subtle micro-animations
 */
import React from 'react';

const variants = {
  primary: {
    base: 'bg-indigo-500 text-white hover:bg-indigo-400 active:bg-indigo-600 shadow-sm hover:shadow-md',
    focus: 'focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2',
  },
  secondary: {
    base: 'border text-secondary hover:text-primary hover:bg-[var(--interactive-hover)] active:bg-[var(--interactive-active)]',
    focus: 'focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
  },
  ghost: {
    base: 'text-secondary hover:text-primary hover:bg-[var(--interactive-hover)] active:bg-[var(--interactive-active)]',
    focus: 'focus-visible:ring-2 focus-visible:ring-slate-400',
  },
  danger: {
    base: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 active:bg-red-500/30',
    focus: 'focus-visible:ring-2 focus-visible:ring-red-400',
  },
  accent: {
    base: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] active:opacity-90',
    focus: 'focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
  },
};

const sizes = {
  xs: 'px-2 py-1 text-[11px] gap-1 rounded-md',
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  xl: 'px-6 py-3 text-base gap-2.5 rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 ease-[var(--ease-apple)]
        select-none whitespace-nowrap
        disabled:opacity-40 disabled:pointer-events-none
        ${s} ${v.base} ${v.focus}
        ${variant === 'secondary' ? 'border-[var(--border-default)]' : ''}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
}
