import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../lib/api';
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

    const handleTaskDeleted = (data) => setTasks((prev) => prev.filter((t) => t.id !== data.id));
    const handleTaskCreated = (newTask) => setTasks((prev) => [newTask, ...prev]);
    const handleTaskUpdated = () => tasksAPI.getAll().then((res) => setTasks(res.data));

    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);

    return () => {
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
    };
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterUser !== 'all' && t.assigned_to !== parseInt(filterUser)) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterUser, searchQuery]);

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
        addToast('Task deleted successfully', 'success');
      }, 300);
    }
  };

  const hasActiveFilters = filterStatus !== 'all' || filterPriority !== 'all' || filterUser !== 'all' || searchQuery !== '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <TasksHeader setShowCreateModal={setShowCreateModal} />

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
      />

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
