import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../EmptyState';

function TaskList({
  loading,
  filteredTasks,
  hasActiveFilters,
  isDeleting,
  priorityColors,
  statusColors,
  statusLabels,
  navigate,
  setEditingTask,
  handleDeleteClick,
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass rounded-xl p-4 animate-pulse">
            <div className="h-4 skeleton-shimmer rounded w-1/3 mb-2" />
            <div className="h-3 skeleton-base rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <EmptyState
        message={hasActiveFilters ? 'Filtreye uygun gorev bulunamadi' : 'Henuz gorev yok, hadi ekleyelim!'}
        icon={hasActiveFilters ? 'search' : 'task'}
      />
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {filteredTasks.map((task, i) => {
          const initials = task.assigned_name
            ? task.assigned_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
            : '??';
          const isDeletingThis = isDeleting === task.id;
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={isDeletingThis ? { scale: 0, opacity: 0, height: 0, marginBottom: 0, padding: 0 } : { opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="glass rounded-xl p-4 card-hover flex flex-col sm:flex-row items-start sm:items-center gap-4 group"
            >
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-primary truncate">{task.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
                    {statusLabels[task.status]}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-secondary truncate">{task.description}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: task.avatar_color || '#7c3aed' }}
                  >
                    {initials}
                  </div>
                  <span className="text-xs text-secondary hidden sm:inline">{task.assigned_name || '-'}</span>
                </div>
                <span className="text-xs text-muted">{task.estimated_hours}h</span>
                <button
                  onClick={() => setEditingTask(task)}
                  className="text-xs text-accent hover:underline transition-all duration-200 hover:scale-110"
                >
                  Duzenle
                </button>
                <button
                  onClick={() => handleDeleteClick(task.id)}
                  className="text-xs text-error hover:underline transition-all duration-200 hover:scale-110"
                >
                  Sil
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default TaskList;
