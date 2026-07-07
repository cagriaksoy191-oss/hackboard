import React from 'react';

function TasksHeader({ setShowCreateModal }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <h2 className="text-2xl font-bold text-primary">Görev Yönetimi</h2>
      <button
        onClick={() => setShowCreateModal(true)}
        className="px-5 py-2.5 bg-gradient-to-r from-accent to-accentAlt text-white font-medium rounded-xl hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        + Yeni Görev
      </button>
    </div>
  );
}

export default TasksHeader;
