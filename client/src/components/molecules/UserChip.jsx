/**
 * UserChip — Molecule
 * Avatar + Name inline display
 */
import React from 'react';
import Avatar from '../atoms/Avatar';

export default function UserChip({
  name,
  color,
  src,
  isOnline,
  showStatus = false,
  size = 'sm',
  subtitle,
  className = '',
  onClick,
}) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      className={`
        inline-flex items-center gap-2
        ${onClick ? 'cursor-pointer hover:bg-[var(--interactive-hover)] rounded-lg px-2 py-1.5 transition-colors duration-150' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      <Avatar
        name={name}
        color={color}
        src={src}
        size={size}
        showStatus={showStatus}
        isOnline={isOnline}
      />
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
          {name}
        </span>
        {subtitle && (
          <span className="text-[10px] text-[var(--text-tertiary)] truncate">
            {subtitle}
          </span>
        )}
      </div>
    </Comp>
  );
}
