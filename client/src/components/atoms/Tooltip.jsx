/**
 * Tooltip — Atom
 * Lightweight hover tooltip with Apple-style appearance
 */
import React, { useState, useRef, useEffect } from 'react';

export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 400,
  className = '',
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  if (!content) return children;

  const positionClasses = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`
            absolute z-[var(--z-tooltip)]
            px-2.5 py-1.5 rounded-lg
            text-[11px] font-medium leading-tight
            whitespace-nowrap
            bg-[var(--slate-800)] text-[var(--slate-100)]
            shadow-lg border border-[var(--border-subtle)]
            animate-fade-in pointer-events-none
            ${positionClasses[position]}
          `.trim().replace(/\s+/g, ' ')}
        >
          {content}
        </div>
      )}
    </div>
  );
}
