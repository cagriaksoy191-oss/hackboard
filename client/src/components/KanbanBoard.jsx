import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tasksAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import socket from '../lib/socket';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import EmptyState from './EmptyState';

const columns = [
  { id: 'todo', title: 'Yapilacak', color: 'from-blue-500/20 to-blue-600/10', borderColor: 'border-blue-500/30', dotColor: 'bg-blue-500' },
  { id: 'in-progress', title: 'Devam Ediyor', color: 'from-yellow-500/20 to-yellow-600/10', borderColor: 'border-yellow-500/30', dotColor: 'bg-yellow-500' },
  { id: 'testing', title: 'Test', color: 'from-purple-500/20 to-purple-600/10', borderColor: 'border-purple-500/30', dotColor: 'bg-purple-500' },
  { id: 'done', title: 'Tamamlandi', color: 'from-green-500/20 to-green-600/10', borderColor: 'border-green-500/30', dotColor: 'bg-green-500' },
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

  useEffect(() => {
    loadTasks();
    socket.on('task:moved', () => loadTasks());
    socket.on('task:deleted', (data) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.id));
    });
    socket.on('task:updated', () => loadTasks());
    socket.on('task:created', (newTask) => {
      setTasks((prev) => [newTask, ...prev]);
    });
    return () => {
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('task:updated');
      socket.off('task:created');
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

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = searchQuery === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesUser = filterUser === 'all' || t.assigned_to === parseInt(filterUser);
    return matchesSearch && matchesPriority && matchesUser;
  });

  const hasActiveFilters = searchQuery !== '' || filterPriority !== 'all' || filterUser !== 'all';

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-white">Kanban Board</h3>
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
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Gorev ara..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent transition-all duration-200"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`px-3 py-2 bg-white/5 border rounded-xl text-white text-sm focus:outline-none transition-all duration-200 ${
              filterPriority !== 'all' ? 'border-accent bg-accent/10' : 'border-white/10'
            }`}
          >
            <option value="all" className="bg-card">Tum Oncelikler</option>
            <option value="critical" className="bg-card">Kritik</option>
            <option value="high" className="bg-card">Yuksek</option>
            <option value="medium" className="bg-card">Orta</option>
            <option value="low" className="bg-card">Dusuk</option>
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={`px-3 py-2 bg-white/5 border rounded-xl text-white text-sm focus:outline-none transition-all duration-200 ${
              filterUser !== 'all' ? 'border-accent bg-accent/10' : 'border-white/10'
            }`}
          >
            <option value="all" className="bg-card">Tum Kisiler</option>
            <option value="1" className="bg-card">Çağrı</option>
            <option value="2" className="bg-card">Talha</option>
            <option value="3" className="bg-card">Ahmet</option>
            <option value="4" className="bg-card">Alaettin</option>
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
            <div key={col.id} className={`bg-gradient-to-b ${col.color} border ${col.borderColor} rounded-2xl p-3 min-h-[300px]`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-white/20 animate-pulse" />
                <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2 mb-3" />
                    <div className="flex justify-between">
                      <div className="h-7 w-7 bg-white/10 rounded-full" />
                      <div className="h-3 bg-white/5 rounded w-8" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isHighlighted = highlightColumn === col.id;
            return (
              <div
                key={col.id}
                className={`bg-gradient-to-b ${col.color} border rounded-2xl p-3 min-h-[300px] transition-all duration-300 ${
                  isHighlighted
                    ? `${col.borderColor} shadow-[0_0_30px_rgba(0,212,255,0.3)] border-accent/50`
                    : col.borderColor
                }`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h4 className="text-sm font-semibold text-white">{col.title}</h4>
                  <span className="ml-auto text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
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
