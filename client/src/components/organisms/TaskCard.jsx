/**
 * TaskCard — Organism
 * Kanban task card with priority, assignee, tags, subtask progress
 * Apple-style minimal card with subtle hover and drag states
 *
 * Uses atoms: Badge, Avatar, Tooltip
 * Preserves existing onDragStart/onDelete/onEdit API for backward compat
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../atoms/Badge';
import Avatar from '../atoms/Avatar';
import Tooltip from '../atoms/Tooltip';
import ConfirmModal from '../ConfirmModal';
import EditTaskModal from '../EditTaskModal';

const priorityLabels = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

function SubtaskProgress({ completed, total }) {
  if (total <= 0) return null;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
        <span>Alt görevler</span>
        <span className="font-medium text-[var(--text-secondary)]">{completed}/{total}</span>
      </div>
      <div className="w-full h-1 bg-[var(--interactive-muted)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="h-full rounded-full bg-[var(--accent-primary)]"
        />
      </div>
    </div>
  );
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export default function TaskCard({ task, onDragStart, onDelete, onEdit, tags = [], isOverdue }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initials = (task.assigned_name || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const subtasksCompleted = task.subtasks_completed || 0;
  const subtasksTotal = task.subtasks_total || 0;

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleting(true);
    setTimeout(() => { if (onDelete) onDelete(task.id); }, 300);
  };

  const handleCardClick = (e) => {
    if (e.target.closest('.card-action')) return;
    if (onEdit) setShowEditModal(true);
  };

  return (
    <>
      <motion.div
        layout
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        onClick={handleCardClick}
        animate={isDeleting ? { scale: 0, opacity: 0, height: 0, marginBottom: 0, padding: 0 } : {}}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className={`
          group rounded-xl p-3.5 cursor-grab active:cursor-grabbing
          bg-[var(--bg-card)] border border-[var(--border-default)]
          hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)]
          hover:shadow-[var(--shadow-md)]
          transition-all duration-200 ease-[var(--ease-apple)]
          ${isDeleting ? 'overflow-hidden' : ''}
          ${isOverdue ? 'animate-pulse-red' : ''}
        `.trim().replace(/\s+/g, ' ')}
      >
        {/* Header: Title + Priority + Delete */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug flex-1 line-clamp-2">
            {task.title}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant={task.priority} size="xs" dot>
              {priorityLabels[task.priority] || task.priority}
            </Badge>
            <Tooltip content="Görevi Sil" position="top">
              <button
                onClick={handleDeleteClick}
                className="card-action opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--accent-danger-muted)] text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] transition-all duration-150"
                aria-label="Görevi Sil"
              >
                <TrashIcon />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-[12px] text-[var(--text-tertiary)] mb-3 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag.id || tag.name}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--interactive-muted)] text-[var(--text-tertiary)]"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color || '#6366f1' }} />
                {tag.name}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-[var(--text-muted)] px-1">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Subtask Progress */}
        <SubtaskProgress completed={subtasksCompleted} total={subtasksTotal} />

        {/* Footer: Assignee + Hours */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar
              name={task.assigned_name || 'Sahipsiz'}
              color={task.assigned_name ? (task.avatar_color || '#6366f1') : '#ef4444'}
              size="xs"
            />
            <span className={`text-[11px] ${!task.assigned_name ? 'text-[var(--accent-danger)] font-medium' : 'text-[var(--text-tertiary)]'}`}>
              {task.assigned_name || 'Sahipsiz'}
            </span>
          </div>
          {task.estimated_hours > 0 && (
            <div className="flex items-center gap-1 text-[var(--text-muted)]">
              <ClockIcon />
              <span className="text-[11px]">{task.estimated_hours}s</span>
            </div>
          )}
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Görevi Sil"
        message="Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />

      <EditTaskModal
        task={task}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          if (onEdit) onEdit();
        }}
      />
    </>
  );
}
