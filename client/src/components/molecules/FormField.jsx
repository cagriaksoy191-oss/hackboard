/**
 * FormField — Molecule
 * Label + Input + Error message composition
 * Wraps the Input atom with consistent form field layout
 */
import React from 'react';
import Input from '../atoms/Input';

export default function FormField({
  label,
  name,
  error,
  hint,
  required = false,
  children,
  ...inputProps
}) {
  // If children are provided, render custom content (e.g., select)
  if (children) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={name}
            className="text-xs font-medium text-[var(--text-secondary)] tracking-wide"
          >
            {label}
            {required && <span className="text-[var(--accent-danger)] ml-0.5">*</span>}
          </label>
        )}
        {children}
        {error && (
          <p className="text-[11px] text-[var(--accent-danger)] font-medium">{error}</p>
        )}
        {hint && !error && (
          <p className="text-[11px] text-[var(--text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }

  return (
    <Input
      id={name}
      name={name}
      label={
        label ? (
          <>
            {label}
            {required && <span className="text-[var(--accent-danger)] ml-0.5">*</span>}
          </>
        ) : undefined
      }
      error={error}
      hint={hint}
      {...inputProps}
    />
  );
}
