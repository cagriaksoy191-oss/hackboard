/**
 * KanbanColumn — Organism
 * Kanban board column with header, task count, drop zone
 * Apple-style clean column with subtle drop indicator
 */
import React, { useState } from 'react';

const DropIndicator = () => (
  <div className="h-1 mx-2 my-1 rounded-full bg-[var(--accent-primary)] opacity-60 animate-pulse" />
);

export default function KanbanColumn({
  title,
  color,
  tasks = [],
  count,
  icon,
  isDoneColumn = false,
  onDragOver,
  onDrop,
  children,
  className = '',
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    if (onDragOver) onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (onDrop) onDrop(e);
  };

  const taskCount = count ?? tasks.length;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0
        rounded-xl
        bg-[var(--bg-surface)] border border-[var(--border-subtle)]
        transition-all duration-200 ease-[var(--ease-apple)]
        ${isDragOver ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)] shadow-[var(--shadow-accent)]' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {color && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          {icon && <span className="text-[var(--text-tertiary)]">{icon}</span>}
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
            {title}
          </h3>
        </div>
        <span className="text-[11px] font-medium text-[var(--text-tertiary)] bg-[var(--interactive-muted)] px-2 py-0.5 rounded-md">
          {taskCount}
        </span>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        {isDragOver && <DropIndicator />}
        {children}
      </div>
    </div>
  );
}
