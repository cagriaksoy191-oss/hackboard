import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Toast';
import socket from '../lib/socket';
import CreateTaskModal from '../components/CreateTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';

const priorityColors = {
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels = {
  todo: 'Yapilacak',
  'in-progress': 'Devam Ediyor',
  testing: 'Test',
  done: 'Tamamlandi',
};

const statusColors = {
  todo: 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-yellow-500/20 text-yellow-400',
  testing: 'bg-purple-500/20 text-purple-400',
  done: 'bg-green-500/20 text-green-400',
};

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const navigate = useNavigate();
  const { user } = useUser();
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([tasksAPI.getAll(), usersAPI.getAll()]).then(([taskRes, userRes]) => {
      setTasks(taskRes.data);
      setUsers(userRes.data);
      setLoading(false);
    });

    const handleTaskDeleted = (data) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.id));
    };
    const handleTaskCreated = (newTask) => {
      setTasks((prev) => [newTask, ...prev]);
    };
    const handleTaskUpdated = () => {
      tasksAPI.getAll().then((res) => setTasks(res.data));
    };

    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);

    return () => {
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
    };
  }, []);

  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterUser !== 'all' && t.assigned_to !== parseInt(filterUser)) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

  const handleDeleteClick = (id) => {
    setDeletingTaskId(id);
  };

  const handleConfirmDelete = async () => {
    if (deletingTaskId) {
      setIsDeleting(deletingTaskId);
      setTimeout(async () => {
        await tasksAPI.delete(deletingTaskId);
        socket.emit('task:delete', { id: deletingTaskId, user_id: user?.id || 1 });
        setTasks((prev) => prev.filter((t) => t.id !== deletingTaskId));
        setDeletingTaskId(null);
        setIsDeleting(null);
        addToast('Task deleted successfully', 'success');
      }, 300);
    }
  };

  const hasActiveFilters = filterStatus !== 'all' || filterPriority !== 'all' || filterUser !== 'all' || searchQuery !== '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-primary">Gorev Yonetimi</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-accent to-accentAlt text-white font-medium rounded-xl hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          + Yeni Gorev
        </button>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="hidden sm:block text-xs text-secondary mb-1 opacity-0 select-none">Arama</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gorev ara..."
                className="w-full pl-10 pr-4 py-2 input-surface border rounded-xl text-sm focus:outline-none focus:border-accent transition-all duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Durum</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`w-full px-3 py-2 input-surface border rounded-xl text-sm focus:outline-none transition-all duration-200 ${
                filterStatus !== 'all' ? 'border-accent bg-accent/10' : ''
              }`}
            >
              <option value="all" className="option-surface">Tumu</option>
              <option value="todo" className="option-surface">Yapilacak</option>
              <option value="in-progress" className="option-surface">Devam Ediyor</option>
              <option value="testing" className="option-surface">Test</option>
              <option value="done" className="option-surface">Tamamlandi</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Oncelik</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={`w-full px-3 py-2 input-surface border rounded-xl text-sm focus:outline-none transition-all duration-200 ${
                filterPriority !== 'all' ? 'border-accent bg-accent/10' : ''
              }`}
            >
              <option value="all" className="option-surface">Tumu</option>
              <option value="critical" className="option-surface">Kritik</option>
              <option value="high" className="option-surface">Yuksek</option>
              <option value="medium" className="option-surface">Orta</option>
              <option value="low" className="option-surface">Dusuk</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Kisi</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className={`w-full px-3 py-2 input-surface border rounded-xl text-sm focus:outline-none transition-all duration-200 ${
                filterUser !== 'all' ? 'border-accent bg-accent/10' : ''
              }`}
            >
              <option value="all" className="option-surface">Tumu</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="option-surface">{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('all');
              setFilterPriority('all');
              setFilterUser('all');
            }}
            className="px-3 py-1.5 bg-error/20 border border-error/30 text-error text-xs rounded-lg hover:bg-error/30 transition-all duration-200"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-4 skeleton-shimmer rounded w-1/3 mb-2" />
              <div className="h-3 skeleton-base rounded w-1/2" />
              </div>
            ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          message={hasActiveFilters ? 'Filtreye uygun gorev bulunamadi' : 'Henuz gorev yok, hadi ekleyelim!'}
          icon={hasActiveFilters ? 'search' : 'task'}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((task, i) => {
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
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-card ${!task.avatar_color ? 'bg-accentAlt' : ''}`} style={task.avatar_color ? { backgroundColor: task.avatar_color } : undefined}
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
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateTaskModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              tasksAPI.getAll().then((res) => setTasks(res.data));
              addToast('Task created successfully', 'success');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSuccess={() => {
              tasksAPI.getAll().then((res) => setTasks(res.data));
              setEditingTask(null);
              addToast('Task updated successfully', 'success');
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deletingTaskId}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleConfirmDelete}
        title="Gorevi Sil"
        message="Bu gorevi silmek istediginize emin misiniz? Bu islem geri alinamaz."
      />
    </motion.div>
  );
}

export default Tasks;
