import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { sprintsAPI, tasksAPI } from '../lib/api';
import { Button } from '../components/atoms';
import Badge from '../components/atoms/Badge';
import Spinner from '../components/atoms/Spinner';
import BurndownChart from '../components/organisms/BurndownChart';
import socket from '../lib/socket';

const STATUS_LABELS = {
  planning: { label: 'Planlama', variant: 'info' },
  active: { label: 'Aktif', variant: 'success' },
  completed: { label: 'Tamamlandı', variant: 'default' },
  cancelled: { label: 'İptal', variant: 'danger' },
};

/* ──────────────────────────────────────────────
   CompleteSprintModal
   ────────────────────────────────────────────── */
function CompleteSprintModal({ show, onClose, onConfirm, sprints, currentSprintId }) {
  const [transferId, setTransferId] = useState('');

  const eligibleSprints = useMemo(() => {
    return sprints.filter(
      (s) => String(s.id) !== String(currentSprintId) && (s.status === 'planning' || s.status === 'active')
    );
  }, [sprints, currentSprintId]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-5 w-full max-w-md shadow-[var(--shadow-xl)]"
      >
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-2 tracking-tight">Sprint'i Tamamla</h2>
        <p className="text-[12px] text-[var(--text-secondary)] mb-4">
          Bu sprint'i tamamlamak istediğinizden emin misiniz? Tamamlanmamış tüm görevler seçtiğiniz hedefe aktarılacaktır.
        </p>

        <div className="mb-4">
          <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">
            Aktarım Hedefi
          </label>
          <select
            value={transferId}
            onChange={(e) => setTransferId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] transition-all duration-150"
          >
            <option value="">Backlog (Hiçbir sprint'e atama)</option>
            {eligibleSprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status === 'active' ? 'Aktif' : 'Planlama'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2.5 pt-1">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            İptal
          </Button>
          <Button variant="accent" size="md" onClick={() => onConfirm(transferId ? Number(transferId) : null)} className="flex-1">
            Tamamla
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   SprintDetail Component
   ────────────────────────────────────────────── */
function SprintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBacklogPanel, setShowBacklogPanel] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const loadData = async () => {
    try {
      const [sprintsRes, sprintTasksRes, allTasksRes] = await Promise.all([
        sprintsAPI.getAll(),
        sprintsAPI.getTasks(id),
        tasksAPI.getAll(),
      ]);
      const found = sprintsRes.data.find((s) => String(s.id) === String(id));
      setSprint(found || null);
      setSprints(sprintsRes.data);
      setTasks(sprintTasksRes.data);
      setAllTasks(allTasksRes.data);
    } catch (err) {
      console.error('Sprint detail load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup live socket synchronization for task CRUD and status shifts
    const handleTaskCreated = () => loadData();
    const handleTaskUpdated = () => loadData();
    const handleTaskDeleted = () => loadData();
    const handleTaskMoved = () => loadData();
    const handleTasksRefresh = () => loadData();
    const handleSprintUpdated = (s) => {
      if (String(s.id) === String(id)) loadData();
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:moved', handleTaskMoved);
    socket.on('tasks:refresh', handleTasksRefresh);
    socket.on('sprint:updated', handleSprintUpdated);

    const handleReconnectRefetch = () => {
      console.info('[SprintDetail] Socket reconnected. Triggering targeted refetch...');
      loadData();
    };
    window.addEventListener('socket:reconnect-refetch', handleReconnectRefetch);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:moved', handleTaskMoved);
      socket.off('tasks:refresh', handleTasksRefresh);
      socket.off('sprint:updated', handleSprintUpdated);
      window.removeEventListener('socket:reconnect-refetch', handleReconnectRefetch);
    };
  }, [id]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const testing = tasks.filter((t) => t.status === 'testing').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, testing, todo, progress };
  }, [tasks]);

  const backlogTasks = useMemo(() => {
    // Pure backlog: tasks with no sprint_id and are not completed
    return allTasks.filter((t) => !t.sprint_id && t.status !== 'done');
  }, [allTasks]);

  const handleAssignTask = async (taskId) => {
    try {
      await tasksAPI.update(taskId, { sprint_id: Number(id) });
      await loadData();
    } catch (err) {
      console.error('Task assign error:', err);
    }
  };

  const handleRemoveTask = async (taskId) => {
    try {
      await tasksAPI.update(taskId, { sprint_id: null });
      await loadData();
    } catch (err) {
      console.error('Task remove error:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'completed') {
      setShowCompleteModal(true);
    } else {
      try {
        await sprintsAPI.updateStatus(id, newStatus);
        await loadData();
      } catch (err) {
        console.error('Status change error:', err);
      }
    }
  };

  const handleCompleteSprint = async (transferSprintId) => {
    try {
      await sprintsAPI.updateStatus(id, 'completed', transferSprintId);
      setShowCompleteModal(false);
      await loadData();
    } catch (err) {
      console.error('Complete sprint error:', err);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  const getDaysLeft = () => {
    if (!sprint?.end_date) return null;
    const diff = Math.ceil((new Date(sprint.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-muted)] text-[13px]">Sprint bulunamadı.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/sprints')} className="mt-4">
          ← Sprint Listesine Dön
        </Button>
      </div>
    );
  }

  const daysLeft = getDaysLeft();
  const statusInfo = STATUS_LABELS[sprint.status] || STATUS_LABELS.planning;

  return (
    <div className="space-y-6">
      {/* Complete Sprint Modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <CompleteSprintModal
            show={showCompleteModal}
            onClose={() => setShowCompleteModal(false)}
            onConfirm={handleCompleteSprint}
            sprints={sprints}
            currentSprintId={id}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Sprint Details and Tasks */}
        <div className={`space-y-6 ${showBacklogPanel ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <button
                onClick={() => navigate('/sprints')}
                className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-2 flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Sprint Listesi
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">
                  {sprint.name}
                </h2>
                <Badge variant={statusInfo.variant} size="sm" dot>
                  {statusInfo.label}
                </Badge>
              </div>
              {sprint.goal && (
                <p className="text-[12px] text-[var(--text-secondary)] mt-1 max-w-lg">{sprint.goal}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text-tertiary)]">
                <span>
                  {formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}
                </span>
                {daysLeft !== null && sprint.status === 'active' && (
                  <span
                    className={
                      daysLeft < 0
                        ? 'text-[var(--accent-danger)]'
                        : daysLeft <= 3
                        ? 'text-[var(--accent-warning)]'
                        : ''
                    }
                  >
                    {daysLeft < 0 ? `${Math.abs(daysLeft)} gün gecikme` : `${daysLeft} gün kaldı`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {sprint.status === 'planning' && (
                <Button variant="accent" size="sm" onClick={() => handleStatusChange('active')}>
                  Sprint'i Başlat
                </Button>
              )}
              {sprint.status === 'active' && (
                <Button variant="secondary" size="sm" onClick={() => handleStatusChange('completed')}>
                  Tamamla
                </Button>
              )}
              <Button
                variant={showBacklogPanel ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowBacklogPanel(!showBacklogPanel)}
              >
                {showBacklogPanel ? 'Backlog Gizle' : 'Backlog Göster'}
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Toplam', value: stats.total, color: 'var(--text-primary)' },
              { label: 'Yapılacak', value: stats.todo, color: 'var(--accent-info)' },
              { label: 'Devam Eden', value: stats.inProgress, color: 'var(--accent-warning)' },
              { label: 'Test', value: stats.testing, color: '#8b5cf6' },
              { label: 'Tamamlanan', value: stats.done, color: 'var(--accent-success)' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3 text-center"
              >
                <p className="text-xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">İlerleme</span>
              <span className="text-[13px] font-bold text-[var(--accent-primary)]">
                {stats.progress}%
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--interactive-muted)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress}%` }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-full bg-[var(--accent-primary)] rounded-full"
              />
            </div>
          </div>

          {/* Burndown Chart */}
          {sprint.status !== 'planning' && tasks.length > 0 && (
            <BurndownChart sprint={sprint} tasks={tasks} />
          )}

          {/* Sprint Tasks (Drag Drop Target) */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const taskId = e.dataTransfer.getData('text/plain');
              if (taskId) handleAssignTask(Number(taskId));
            }}
            className="space-y-3"
          >
            <h3 className="text-[13px] font-bold text-[var(--text-primary)] mb-3">
              Sprint Görevleri
            </h3>
            {tasks.length === 0 ? (
              <div className="rounded-xl bg-[var(--bg-card)] border border-dashed border-[var(--border-default)] p-8 text-center text-[var(--text-muted)]">
                Bu sprint'e henüz görev atanmamış. Backlog'dan sürükleyip buraya bırakabilirsiniz.
              </div>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-150 ease-[var(--ease-apple)] text-left group"
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        task.status === 'done'
                          ? 'bg-emerald-500'
                          : task.status === 'in-progress'
                          ? 'bg-amber-500'
                          : task.status === 'testing'
                          ? 'bg-violet-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className={`text-[12px] font-medium flex-1 truncate cursor-pointer ${
                        task.status === 'done'
                          ? 'line-through text-[var(--text-muted)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {task.title}
                    </span>
                    <Badge variant={task.priority} size="xs">
                      {task.priority}
                    </Badge>
                    {task.assigned_name && (
                      <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                        {task.assigned_name}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] transition-all duration-150 shrink-0"
                      title="Sprint'ten Çıkar"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Backlog Panel */}
        <AnimatePresence>
          {showBacklogPanel && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-md)] h-[fit-content] space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[var(--text-primary)]">
                  Backlog Görevleri
                </h3>
                <span className="text-[10px] bg-[var(--interactive-muted)] text-[var(--text-muted)] px-1.5 py-0.5 rounded font-mono">
                  {backlogTasks.length} adet
                </span>
              </div>

              {backlogTasks.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)] text-center py-6">
                  Backlog'da tamamlanmamış görev bulunmamaktadır.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {backlogTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(task.id));
                      }}
                      className="flex flex-col gap-2 p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all duration-150 cursor-grab active:cursor-grabbing group shadow-[var(--shadow-sm)]"
                    >
                      <div className="flex items-start gap-2 justify-between">
                        <Badge variant={task.priority} size="xs">
                          {task.priority}
                        </Badge>
                        <button
                          onClick={() => handleAssignTask(task.id)}
                          className="text-[10px] text-[var(--accent-primary)] font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          + Ata
                        </button>
                      </div>
                      <span className="text-[12px] text-[var(--text-primary)] font-medium leading-normal line-clamp-2">
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SprintDetail;
