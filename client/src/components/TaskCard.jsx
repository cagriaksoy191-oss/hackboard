import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from './ConfirmModal';
import EditTaskModal from './EditTaskModal';

const priorityColors = {
  low: 'bg-blue-500/20 text-blue-500 dark:text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
};

const priorityLabels = {
  low: 'Dusuk',
  medium: 'Orta',
  high: 'Yuksek',
  critical: 'Kritik',
};

function TaskCard({ task, onDragStart, onDelete, onEdit }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const initials = task.assigned_name
    ? task.assigned_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const subtasksCompleted = task.subtasks_completed || 0;
  const subtasksTotal = task.subtasks_total || 0;
  const progress = subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0;

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      if (onDelete) onDelete(task.id);
    }, 300);
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
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        animate={isDeleting ? { scale: 0, opacity: 0, height: 0, marginBottom: 0, padding: 0 } : {}}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`glass border-theme rounded-xl p-4 cursor-grab active:cursor-grabbing card-hover group ${isDeleting ? 'overflow-hidden' : ''}`}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-semibold text-primary flex-1">{task.title}</h4>
          <div className="flex items-center gap-1 ml-2">
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </span>
            <button
              onClick={handleDeleteClick}
              className="card-action opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/20 text-tertiary hover:text-error transition-all duration-200"
              title="Gorevi Sil"
              aria-label="Gorevi Sil"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-secondary mb-3 line-clamp-2">{task.description}</p>
        )}

        {subtasksTotal > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-secondary mb-1">
              <span>Alt gorevler</span>
              <span>{subtasksCompleted}/{subtasksTotal}</span>
            </div>
            <div className="w-full h-1.5 surface-bg-strong rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-accent to-accentAlt rounded-full"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white"
              style={{ backgroundColor: task.avatar_color || '#7c3aed' }}
            >
              {initials}
            </div>
            <span className="text-xs text-secondary">{task.assigned_name || 'Atanmamis'}</span>
          </div>
          {task.estimated_hours > 0 && (
            <span className="text-xs text-tertiary">{task.estimated_hours}h</span>
          )}
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Gorevi Sil"
        message="Bu gorevi silmek istediginize emin misiniz? Bu islem geri alinamaz."
      />

      <AnimatePresence>
        {showEditModal && (
          <EditTaskModal
            task={task}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              setShowEditModal(false);
              if (onEdit) onEdit();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default TaskCard;
