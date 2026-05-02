import React, { useState, useEffect } from 'react';
import { getInitials } from '../lib/stringUtils';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Toast';
import socket from '../lib/socket';
import TaskTimer from '../components/TaskTimer';
import ConfirmModal from '../components/ConfirmModal';


const priorityColors = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

const statusLabels = {
  todo: 'Yapilacak',
  'in-progress': 'Devam Ediyor',
  testing: 'Test',
  done: 'Tamamlandi',
};


function calculateProgress(subtasks) {
  if (!subtasks || subtasks.length === 0) return 0;
  const completedCount = subtasks.filter((s) => s.is_completed).length;
  return (completedCount / subtasks.length) * 100;
}

function checkIsOverBudget(task) {
  if (!task) return false;
  return task.estimated_hours > 0 && task.actual_hours > task.estimated_hours;
}

function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { addToast } = useToast();
  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();

    const handleTaskDeleted = (data) => {
      if (data.id === parseInt(id)) {
        addToast('Task was deleted', 'info');
        navigate('/tasks');
      }
    };
    const handleSubtaskCreated = (data) => {
      if (data.taskId === parseInt(id)) {
        tasksAPI.getSubtasks(id).then((res) => setSubtasks(res.data));
      }
    };
    const handleSubtaskToggled = (data) => {
      if (data.taskId === parseInt(id)) {
        tasksAPI.getSubtasks(id).then((res) => setSubtasks(res.data));
      }
    };
    const handleCommentAdded = (data) => {
      if (data.taskId === parseInt(id)) {
        tasksAPI.getComments(id).then((res) => setComments(res.data));
      }
    };
    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask && updatedTask.id === parseInt(id)) {
        setTask(updatedTask);
      }
    };
    const handleTimerStart = (data) => {
      if (data.taskId === parseInt(id)) {
        setTask((prev) => ({ ...prev, timerStarted: true }));
      }
    };
    const handleTimerStop = (data) => {
      if (data.taskId === parseInt(id)) {
        setTask((prev) => ({ ...prev, actual_hours: data.actualHours, timerStarted: false }));
      }
    };

    socket.on('task:deleted', handleTaskDeleted);
    socket.on('subtask:created', handleSubtaskCreated);
    socket.on('subtask:toggled', handleSubtaskToggled);
    socket.on('comment:added', handleCommentAdded);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('timer:start', handleTimerStart);
    socket.on('timer:stop', handleTimerStop);

    return () => {
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('subtask:created', handleSubtaskCreated);
      socket.off('subtask:toggled', handleSubtaskToggled);
      socket.off('comment:added', handleCommentAdded);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('timer:start', handleTimerStart);
      socket.off('timer:stop', handleTimerStop);
    };
  }, [id]);

  const loadData = async () => {
    const [taskRes, subRes, comRes, userRes] = await Promise.all([
      tasksAPI.getAll(),
      tasksAPI.getSubtasks(id),
      tasksAPI.getComments(id),
      usersAPI.getAll(),
    ]);
    const found = taskRes.data.find((t) => t.id === parseInt(id));
    setTask(found);
    setSubtasks(subRes.data);
    setComments(comRes.data);
    setUsers(userRes.data);
  };

  const handleToggleSubtask = async (subtaskId) => {
    await tasksAPI.toggleSubtask(subtaskId);
    const res = await tasksAPI.getSubtasks(id);
    setSubtasks(res.data);
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    await tasksAPI.createSubtask(id, { title: newSubtask });
    setNewSubtask('');
    const res = await tasksAPI.getSubtasks(id);
    setSubtasks(res.data);
    addToast('Subtask added', 'success');
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await tasksAPI.createComment(id, { user_id: user?.id || 1, content: newComment });
    setNewComment('');
    const res = await tasksAPI.getComments(id);
    setComments(res.data);
    addToast('Comment added', 'success');
  };

  const handleDeleteTask = async () => {
    await tasksAPI.delete(id);
    socket.emit('task:delete', { id: parseInt(id), user_id: user?.id || 1 });
    addToast('Task deleted', 'success');
    navigate('/tasks');
  };

  const handleTimeUpdate = (hours) => {
    setTask((prev) => ({ ...prev, actual_hours: hours }));
    addToast('Timer stopped', 'info');
  };

  if (!task) return <div className="text-center py-20 text-secondary">Yukleniyor...</div>;


  const progress = calculateProgress(subtasks);
  const isOverBudget = checkIsOverBudget(task);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-secondary hover:text-primary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Geri Don
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-error/20 border border-error/30 text-error text-sm rounded-xl hover:bg-error/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Gorevi Sil
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-primary mb-2">{task.title}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full surface-bg border border-theme-subtle text-secondary">
                {statusLabels[task.status]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: task.avatar_color || '#7c3aed' }}
            >
              {getInitials(task.assigned_name)}
            </div>
            <span className="text-sm text-secondary">{task.assigned_name || 'Atanmamis'}</span>
          </div>
        </div>

        {task.description && (
          <p className="text-secondary text-sm mb-4">{task.description}</p>
        )}

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="surface-bg rounded-xl p-3 text-center">
            <p className="text-xs text-secondary">Tahmini</p>
            <p className="text-lg font-bold text-primary">{task.estimated_hours}h</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${isOverBudget ? 'bg-error/10' : 'surface-bg'}`}>
            <p className="text-xs text-secondary">Harcanan</p>
            <p className={`text-lg font-bold ${isOverBudget ? 'text-error' : 'text-primary'}`}>
              {task.actual_hours}h
            </p>
          </div>
          <div className="surface-bg rounded-xl p-3 text-center">
            <p className="text-xs text-secondary">Ilerleme</p>
            <p className="text-lg font-bold text-primary">{Math.round(progress)}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-secondary">Zamanlayici</span>
          <TaskTimer task={task} onTimeUpdate={handleTimeUpdate} />
        </div>

        {subtasks.length > 0 && (
          <div className="mb-2">
            <div className="w-full h-2 surface-bg-strong rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-accent to-accentAlt rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-primary mb-4">Alt Gorevler</h3>
        <div className="space-y-2 mb-4">
          {subtasks.map((st) => (
            <label
              key={st.id}
              className="flex items-center gap-3 p-3 rounded-xl surface-bg border border-theme-subtle hover-surface-bg-hover transition-all duration-200 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!st.is_completed}
                onChange={() => handleToggleSubtask(st.id)}
                className="w-4 h-4 rounded border border-theme input-surface text-accent focus:ring-accent focus:ring-offset-0"
              />
              <span className={`text-sm ${st.is_completed ? 'line-through text-muted' : 'text-primary'}`}>
                {st.title}
              </span>
            </label>
          ))}
        </div>
        <form onSubmit={handleAddSubtask} className="flex gap-2">
          <input
            type="text"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Yeni alt gorev ekle..."
            className="flex-1 px-3 py-2 input-surface border rounded-lg text-sm focus:outline-none focus:border-accent transition-all duration-200"
          />
          <button type="submit" className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            Ekle
          </button>
        </form>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-primary mb-4">Yorumlar</h3>
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-xl surface-bg border border-theme-subtle">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: c.avatar_color || '#7c3aed' }}
              >
                {c.name?.[0] || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-primary">{c.name}</span>
                  <span className="text-xs text-muted">
                    {new Date(c.created_at).toLocaleString('tr-TR')}
                  </span>
                </div>
                <p className="text-sm text-secondary">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Yorum yaz..."
            className="flex-1 px-3 py-2 input-surface border rounded-lg text-sm focus:outline-none focus:border-accent transition-all duration-200"
          />
          <button type="submit" className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            Gonder
          </button>
        </form>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTask}
        title="Gorevi Sil"
        message="Bu gorevi silmek istediginize emin misiniz? Alt gorevler ve yorumlar ile birlikte kaldirilacak."
      />
    </motion.div>
  );
}

export default TaskDetail;
