/**
 * Avatar — Atom
 * User avatar with color, initials, online status indicator
 */
import React from 'react';

const sizeMap = {
  xs: { container: 'w-5 h-5', text: 'text-[9px]',  dot: 'w-1.5 h-1.5 border' },
  sm: { container: 'w-7 h-7', text: 'text-[10px]', dot: 'w-2 h-2 border-[1.5px]' },
  md: { container: 'w-8 h-8', text: 'text-xs',     dot: 'w-2.5 h-2.5 border-2' },
  lg: { container: 'w-10 h-10', text: 'text-sm',   dot: 'w-3 h-3 border-2' },
  xl: { container: 'w-14 h-14', text: 'text-lg',   dot: 'w-3.5 h-3.5 border-2' },
};

export default function Avatar({
  name = '',
  color,
  src,
  size = 'md',
  showStatus = false,
  isOnline = false,
  className = '',
}) {
  const s = sizeMap[size] || sizeMap.md;
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bgColor = color || '#6366f1';

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${s.container} rounded-full object-cover ring-1 ring-[var(--border-subtle)]`}
        />
      ) : (
        <div
          className={`
            ${s.container} rounded-full
            flex items-center justify-center
            font-semibold ${s.text} text-white
            ring-1 ring-white/10
            select-none
          `.trim().replace(/\s+/g, ' ')}
          style={{ backgroundColor: bgColor }}
          title={name}
        >
          {initials || '?'}
        </div>
      )}
      {showStatus && (
        <span
          className={`
            absolute -bottom-0.5 -right-0.5 ${s.dot}
            rounded-full border-[var(--bg-app)]
            ${isOnline ? 'bg-[var(--status-online)]' : 'bg-[var(--status-offline)]'}
          `.trim().replace(/\s+/g, ' ')}
        />
      )}
    </div>
  );
}
