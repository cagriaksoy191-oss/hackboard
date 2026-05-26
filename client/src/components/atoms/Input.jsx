/**
 * Input — Atom
 * text, email, password, search, textarea variants
 * Apple-style clean input with subtle focus ring
 */
import React, { forwardRef } from 'react';

const Input = forwardRef(function Input({
  type = 'text',
  label,
  error,
  hint,
  icon,
  iconRight,
  size = 'md',
  multiline = false,
  rows = 3,
  className = '',
  containerClassName = '',
  ...props
}, ref) {

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  };

  const s = sizes[size] || sizes.md;

  const inputClasses = `
    w-full rounded-lg
    bg-[var(--bg-input)] border border-[var(--border-input)]
    text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
    transition-all duration-150 ease-[var(--ease-apple)]
    hover:bg-[var(--bg-input-hover)] hover:border-[var(--border-strong)]
    focus:border-[var(--accent-primary)] focus:bg-[var(--bg-input-hover)]
    focus:ring-2 focus:ring-[var(--accent-primary-muted)] focus:outline-none
    disabled:opacity-40 disabled:pointer-events-none
    ${icon ? 'pl-9' : ''} ${iconRight ? 'pr-9' : ''}
    ${error ? 'border-[var(--accent-danger)] focus:ring-[var(--accent-danger-muted)] focus:border-[var(--accent-danger)]' : ''}
    ${s} ${className}
  `.trim().replace(/\s+/g, ' ');

  const Comp = multiline ? 'textarea' : 'input';

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
            {icon}
          </span>
        )}
        <Comp
          ref={ref}
          type={multiline ? undefined : type}
          rows={multiline ? rows : undefined}
          className={inputClasses}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-[var(--accent-danger)] font-medium">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[11px] text-[var(--text-tertiary)]">{hint}</p>
      )}
    </div>
  );
});

export default Input;
