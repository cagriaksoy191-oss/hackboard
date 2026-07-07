import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI, sprintsAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Toast';
import socket from '../lib/socket';
import CreateTaskModal from '../components/CreateTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import ConfirmModal from '../components/ConfirmModal';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskList from '../components/tasks/TaskList';
import TasksHeader from '../components/tasks/TasksHeader';
import { priorityColors, statusLabels, statusColors } from '../components/tasks/constants';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'sprints' | 'backlog'
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
    Promise.all([
      tasksAPI.getAll().catch((err) => { console.error('Failed to load tasks:', err); return { data: [] }; }),
      usersAPI.getAll().catch((err) => { console.error('Failed to load users:', err); return { data: [] }; }),
      sprintsAPI.getAll().catch((err) => { console.error('Failed to load sprints:', err); return { data: [] }; })
    ]).then(([taskRes, userRes, sprintRes]) => {
      setTasks(taskRes.data);
      setUsers(userRes.data);
      setSprints(sprintRes.data);
      setLoading(false);
    });

    // ⚡ Bolt Optimization: Update tasks via local state mapped from socket event payload
    // rather than refetching all tasks via tasksAPI.getAll(), reducing backend load and latency.
    const handleTaskDeleted = (data) => setTasks((prev) => prev.filter((t) => t.id !== data.id));
    const handleTaskCreated = (newTask) => setTasks((prev) => [newTask, ...prev]);
    const handleTaskUpdated = (updatedTask) => setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));

    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskUpdated);

    return () => {
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskUpdated);
    };
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (activeTab === 'backlog' && t.sprint_id) return false;
      if (activeTab === 'sprints' && !t.sprint_id) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterUser !== 'all' && t.assigned_to !== parseInt(filterUser)) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterUser, searchQuery, activeTab]);

  const handleAssignSprint = async (taskId, sprintId) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (taskToUpdate) {
        await tasksAPI.update(taskId, {
          ...taskToUpdate,
          sprint_id: sprintId,
        });
        addToast(sprintId ? 'Görev sprint\'e atandı' : 'Görev backlog\'a taşındı', 'success');
        // Update local state to trigger rerender immediately
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, sprint_id: sprintId } : t));
        socket.emit('task:update', { id: taskId, sprint_id: sprintId, user_id: user?.id || 1 });
      }
    } catch (err) {
      console.error('Failed to assign sprint:', err);
      addToast('Görev güncellenirken hata oluştu', 'error');
    }
  };

  const handleDeleteClick = (id) => setDeletingTaskId(id);

  const handleConfirmDelete = async () => {
    if (deletingTaskId) {
      setIsDeleting(deletingTaskId);
      setTimeout(async () => {
        await tasksAPI.delete(deletingTaskId);
        socket.emit('task:delete', { id: deletingTaskId, user_id: user?.id || 1 });
        setTasks((prev) => prev.filter((t) => t.id !== deletingTaskId));
        setDeletingTaskId(null);
        setIsDeleting(null);
        addToast('Görev başarıyla silindi', 'success');
      }, 300);
    }
  };

  const hasActiveFilters = filterStatus !== 'all' || filterPriority !== 'all' || filterUser !== 'all' || searchQuery !== '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <TasksHeader setShowCreateModal={setShowCreateModal} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-1">
        {[
          { id: 'all', label: 'Tüm Görevler' },
          { id: 'sprints', label: 'Sprint Görevleri' },
          { id: 'backlog', label: 'Backlog' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all relative ${
              activeTab === tab.id
                ? 'text-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--interactive-hover)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTaskTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]"
                transition={{ type: 'spring', damping: 30, stiffness: 500 }}
              />
            )}
          </button>
        ))}
      </div>

      <TaskFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        filterUser={filterUser}
        setFilterUser={setFilterUser}
        users={users}
        hasActiveFilters={hasActiveFilters}
      />

      <TaskList
        loading={loading}
        filteredTasks={filtered}
        hasActiveFilters={hasActiveFilters}
        isDeleting={isDeleting}
        priorityColors={priorityColors}
        statusColors={statusColors}
        statusLabels={statusLabels}
        navigate={navigate}
        setEditingTask={setEditingTask}
        handleDeleteClick={handleDeleteClick}
        sprints={sprints}
        onAssignSprint={handleAssignSprint}
      />

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          tasksAPI.getAll().then((res) => setTasks(res.data));
          addToast('Görev başarıyla oluşturuldu', 'success');
        }}
      />

      <EditTaskModal
        isOpen={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSuccess={() => {
          tasksAPI.getAll().then((res) => setTasks(res.data));
          setEditingTask(null);
          addToast('Görev başarıyla güncellendi', 'success');
        }}
      />

      <ConfirmModal
        isOpen={!!deletingTaskId}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleConfirmDelete}
        title="Görevi Sil"
        message="Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />
    </motion.div>
  );
}

export default Tasks;
