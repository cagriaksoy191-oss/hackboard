import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../components/Toast';
import socket from '../lib/socket';
import TaskTimer from '../components/TaskTimer';
import ConfirmModal from '../components/ConfirmModal';

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
    socket.on('task:deleted', (data) => {
      if (data.id === parseInt(id)) {
        addToast('Task was deleted', 'info');
        navigate('/tasks');
      }
    });
    socket.on('subtask:created', (data) => {
      if (data.taskId === parseInt(id)) {
        tasksAPI.getSubtasks(id).then((res) => setSubtasks(res.data));
      }
    });
    socket.on('subtask:toggled', (data) => {
      if (data.taskId === parseInt(id)) {
        tasksAPI.getSubtasks(id).then((res) => setSubtasks(res.data));
      }
    });
    socket.on('comment:added', (data) => {
      if (data.taskId === parseInt(id)) {
        tasksAPI.getComments(id).then((res) => setComments(res.data));
      }
    });
    socket.on('task:updated', (updatedTask) => {
      if (updatedTask && updatedTask.id === parseInt(id)) {
        setTask(updatedTask);
      }
    });
    socket.on('timer:start', (data) => {
      if (data.taskId === parseInt(id)) {
        setTask((prev) => ({ ...prev, timerStarted: true }));
      }
    });
    socket.on('timer:stop', (data) => {
      if (data.taskId === parseInt(id)) {
        setTask((prev) => ({ ...prev, actual_hours: data.actualHours, timerStarted: false }));
      }
    });
    return () => {
      socket.off('task:deleted');
      socket.off('subtask:created');
      socket.off('subtask:toggled');
      socket.off('comment:added');
      socket.off('task:updated');
      socket.off('timer:start');
      socket.off('timer:stop');
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

  if (!task) return <div className="text-center py-20 text-gray-400">Yukleniyor...</div>;

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

  const completedCount = subtasks.filter((s) => s.is_completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;
  const isOverBudget = task.estimated_hours > 0 && task.actual_hours > task.estimated_hours;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
            <h2 className="text-xl font-bold text-white mb-2">{task.title}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                {statusLabels[task.status]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: task.avatar_color || '#7c3aed' }}
            >
              {task.assigned_name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??'}
            </div>
            <span className="text-sm text-gray-300">{task.assigned_name || 'Atanmamis'}</span>
          </div>
        </div>

        {task.description && (
          <p className="text-gray-400 text-sm mb-4">{task.description}</p>
        )}

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Tahmini</p>
            <p className="text-lg font-bold text-white">{task.estimated_hours}h</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${isOverBudget ? 'bg-error/10' : 'bg-white/5'}`}>
            <p className="text-xs text-gray-400">Harcanan</p>
            <p className={`text-lg font-bold ${isOverBudget ? 'text-error' : 'text-white'}`}>
              {task.actual_hours}h
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Ilerleme</p>
            <p className="text-lg font-bold text-white">{Math.round(progress)}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Zamanlayici</span>
          <TaskTimer task={task} onTimeUpdate={handleTimeUpdate} />
        </div>

        {subtasks.length > 0 && (
          <div className="mb-2">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
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
        <h3 className="text-lg font-bold text-white mb-4">Alt Gorevler</h3>
        <div className="space-y-2 mb-4">
          {subtasks.map((st) => (
            <label
              key={st.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!st.is_completed}
                onChange={() => handleToggleSubtask(st.id)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent focus:ring-accent focus:ring-offset-0"
              />
              <span className={`text-sm ${st.is_completed ? 'line-through text-gray-500' : 'text-white'}`}>
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
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent transition-all duration-200"
          />
          <button type="submit" className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            Ekle
          </button>
        </form>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Yorumlar</h3>
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-xl bg-white/5">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: c.avatar_color || '#7c3aed' }}
              >
                {c.name?.[0] || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{c.name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleString('tr-TR')}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{c.content}</p>
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
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent transition-all duration-200"
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
