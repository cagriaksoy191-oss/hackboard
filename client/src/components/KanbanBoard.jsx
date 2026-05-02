import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tasksAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import socket from '../lib/socket';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import EmptyState from './EmptyState';


const filterTasks = (tasks, searchQuery, filterPriority, filterUser) => {
  return tasks.filter((t) => {
    const matchesSearch = searchQuery === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesUser = filterUser === 'all' || t.assigned_to === parseInt(filterUser);
    return matchesSearch && matchesPriority && matchesUser;
  });
};

const checkActiveFilters = (searchQuery, filterPriority, filterUser) => {
  return searchQuery !== '' || filterPriority !== 'all' || filterUser !== 'all';
};

const getSelectClassName = (filterValue) => {
  return `px-3 py-2 input-surface border-theme rounded-xl text-sm focus:outline-none transition-all duration-200 ${
    filterValue !== 'all' ? 'border-accent bg-accent/10' : ''
  }`;
};

const getSkeletonColumnClassName = (col) => {
  return `bg-gradient-to-b ${col.darkColor} ${col.lightColor} border ${col.darkBorder} ${col.lightBorder} rounded-2xl p-3 min-h-[300px]`;
};

const getColumnClassName = (col, isHighlighted) => {
  return `bg-gradient-to-b ${col.darkColor} ${col.lightColor} border rounded-2xl p-3 min-h-[300px] transition-all duration-300 scroll-mt-[100px] ${
    isHighlighted
      ? `${col.darkBorder} ${col.lightBorder} shadow-[0_0_30px_rgba(0,212,255,0.3)] border-accent/50`
      : `${col.darkBorder} ${col.lightBorder}`
  }`;
};

const columns = [
  { id: 'todo', title: 'Yapilacak', darkColor: 'dark:from-blue-500/20 dark:to-blue-600/10', lightColor: 'from-blue-50 to-blue-100/50', darkBorder: 'dark:border-blue-500/30', lightBorder: 'border-blue-200', dotColor: 'bg-blue-500' },
  { id: 'in-progress', title: 'Devam Ediyor', darkColor: 'dark:from-yellow-500/20 dark:to-yellow-600/10', lightColor: 'from-yellow-50 to-yellow-100/50', darkBorder: 'dark:border-yellow-500/30', lightBorder: 'border-yellow-200', dotColor: 'bg-yellow-500' },
  { id: 'testing', title: 'Test', darkColor: 'dark:from-purple-500/20 dark:to-purple-600/10', lightColor: 'from-purple-50 to-purple-100/50', darkBorder: 'dark:border-purple-500/30', lightBorder: 'border-purple-200', dotColor: 'bg-purple-500' },
  { id: 'done', title: 'Tamamlandi', darkColor: 'dark:from-green-500/20 dark:to-green-600/10', lightColor: 'from-green-50 to-green-100/50', darkBorder: 'dark:border-green-500/30', lightBorder: 'border-green-200', dotColor: 'bg-green-500' },
];

function KanbanBoard() {
  const { user } = useUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [highlightColumn, setHighlightColumn] = useState(null);
  const [pulseTaskId, setPulseTaskId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [kanbanUsers, setKanbanUsers] = useState([]);

  useEffect(() => {
    loadTasks();
    usersAPI.getAll().then((res) => setKanbanUsers(res.data)).catch(() => {});

    const handleTaskMoved = () => loadTasks();
    const handleTaskDeleted = (data) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.id));
    };
    const handleTaskUpdated = () => loadTasks();
    const handleTaskCreated = (newTask) => {
      setTasks((prev) => [newTask, ...prev]);
    };

    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:created', handleTaskCreated);

    return () => {
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:created', handleTaskCreated);
    };
  }, []);

  const loadTasks = () => {
    tasksAPI.getAll().then((res) => {
      setTasks(res.data);
      setLoading(false);
    });
  };

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHighlightColumn(colId);
  };

  const handleDragLeave = () => {
    setHighlightColumn(null);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    setHighlightColumn(null);
    if (draggedTaskId) {
      socket.emit('task:move', { id: draggedTaskId, status, user_id: user?.id || 1 });
      setPulseTaskId(draggedTaskId);
      setDraggedTaskId(null);
      setTimeout(() => setPulseTaskId(null), 600);
    }
  };

  const handleDeleteTask = (taskId) => {
    socket.emit('task:delete', { id: taskId, user_id: user?.id || 1 });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setHighlightColumn(null);
  };

  const filteredTasks = filterTasks(tasks, searchQuery, filterPriority, filterUser);

  const hasActiveFilters = checkActiveFilters(searchQuery, filterPriority, filterUser);

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-primary">Kanban Board</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-accent to-accentAlt text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          + Yeni Gorev
        </button>
      </div>

      <div className="glass rounded-2xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Gorev ara..."
              aria-label="Gorev Ara"
              className="w-full pl-10 pr-4 py-2 input-surface border-theme rounded-xl text-sm focus:outline-none focus:border-accent transition-all duration-200"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={getSelectClassName(filterPriority)}
          >
            <option value="all" className="option-surface">Tum Oncelikler</option>
            <option value="critical" className="option-surface">Kritik</option>
            <option value="high" className="option-surface">Yuksek</option>
            <option value="medium" className="option-surface">Orta</option>
            <option value="low" className="option-surface">Dusuk</option>
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={getSelectClassName(filterUser)}
          >
            <option value="all" className="option-surface">Tum Kisiler</option>
            {kanbanUsers.map((u) => (
              <option key={u.id} value={u.id} className="option-surface">{u.name}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterPriority('all');
                setFilterUser('all');
              }}
              className="px-3 py-2 bg-error/20 border border-error/30 text-error text-sm rounded-xl hover:bg-error/30 transition-all duration-200"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => (
            <div key={col.id} className={getSkeletonColumnClassName(col)}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full surface-bg-strong animate-pulse" />
                <div className="h-4 w-20 skeleton-shimmer rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="surface-bg border border-theme-subtle rounded-xl p-4 animate-pulse">
                    <div className="h-4 skeleton-shimmer rounded w-3/4 mb-2" />
                    <div className="h-3 skeleton-base rounded w-1/2 mb-3" />
                    <div className="flex justify-between">
                      <div className="h-7 w-7 skeleton-shimmer rounded-full" />
                      <div className="h-3 skeleton-base rounded w-8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          message={hasActiveFilters ? 'Filtreye uygun gorev bulunamadi' : 'Henuz gorev yok, hadi ekleyelim!'}
          icon="task"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" id="kanban-board-container">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isHighlighted = highlightColumn === col.id;
            return (
              <div
                id={`kanban-col-${col.id}`}
                key={col.id}
                className={getColumnClassName(col, isHighlighted)}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h4 className="text-sm font-semibold text-primary">{col.title}</h4>
                  <span className="ml-auto text-xs text-secondary surface-bg border border-theme-subtle px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {colTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        animate={pulseTaskId === task.id ? { scale: [1, 1.03, 1] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        <TaskCard
                          task={task}
                          onDragStart={handleDragStart}
                          onDelete={handleDeleteTask}
                          onEdit={loadTasks}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateTaskModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadTasks();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default KanbanBoard;
