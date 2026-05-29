import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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

function SprintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [sprintsRes, sprintTasksRes, allTasksRes] = await Promise.all([
          sprintsAPI.getAll(),
          sprintsAPI.getTasks(id),
          tasksAPI.getAll(),
        ]);
        const found = sprintsRes.data.find(s => String(s.id) === String(id));
        setSprint(found || null);
        setTasks(sprintTasksRes.data);
        setAllTasks(allTasksRes.data);
      } catch (err) {
        console.error('Sprint detail load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();

    const handleSprintUpdated = (s) => {
      if (String(s.id) === String(id)) setSprint(s);
    };
    socket.on('sprint:updated', handleSprintUpdated);
    return () => socket.off('sprint:updated', handleSprintUpdated);
  }, [id]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const testing = tasks.filter(t => t.status === 'testing').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, testing, todo, progress };
  }, [tasks]);

  const unassignedTasks = useMemo(() => {
    const sprintTaskIds = new Set(tasks.map(t => t.id));
    return allTasks.filter(t => !sprintTaskIds.has(t.id) && t.status !== 'done');
  }, [allTasks, tasks]);

  const handleAssignTask = async (taskId) => {
    try {
      await tasksAPI.update(taskId, { sprint_id: Number(id) });
      // Reload
      const res = await sprintsAPI.getTasks(id);
      setTasks(res.data);
      const allRes = await tasksAPI.getAll();
      setAllTasks(allRes.data);
    } catch (err) {
      console.error('Task assign error:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await sprintsAPI.updateStatus(id, newStatus);
      const sprintsRes = await sprintsAPI.getAll();
      const found = sprintsRes.data.find(s => String(s.id) === String(id));
      setSprint(found);
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  const getDaysLeft = () => {
    if (!sprint?.end_date) return null;
    const diff = Math.ceil((new Date(sprint.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/sprints')}
            className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-2 flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Sprint Listesi
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">{sprint.name}</h2>
            <Badge variant={statusInfo.variant} size="sm" dot>{statusInfo.label}</Badge>
          </div>
          {sprint.goal && (
            <p className="text-[12px] text-[var(--text-secondary)] mt-1 max-w-lg">{sprint.goal}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text-tertiary)]">
            <span>{formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}</span>
            {daysLeft !== null && sprint.status === 'active' && (
              <span className={daysLeft < 0 ? 'text-[var(--accent-danger)]' : daysLeft <= 3 ? 'text-[var(--accent-warning)]' : ''}>
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
          <Button variant="secondary" size="sm" onClick={() => setShowAssignModal(!showAssignModal)}>
            + Görev Ata
          </Button>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Toplam', value: stats.total, color: 'var(--text-primary)' },
          { label: 'Yapılacak', value: stats.todo, color: 'var(--accent-info)' },
          { label: 'Devam Eden', value: stats.inProgress, color: 'var(--accent-warning)' },
          { label: 'Test', value: stats.testing, color: '#8b5cf6' },
          { label: 'Tamamlanan', value: stats.done, color: 'var(--accent-success)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3 text-center">
            <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Progress Bar ─── */}
      <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium text-[var(--text-primary)]">İlerleme</span>
          <span className="text-[13px] font-bold text-[var(--accent-primary)]">{stats.progress}%</span>
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

      {/* ─── Burndown Chart ─── */}
      {sprint.status !== 'planning' && tasks.length > 0 && (
        <BurndownChart sprint={sprint} tasks={tasks} />
      )}

      {/* ─── Assign Task Modal ─── */}
      {showAssignModal && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-lg)]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Görev Ata</h3>
            <button onClick={() => setShowAssignModal(false)} className="p-1 rounded-md hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          {unassignedTasks.length === 0 ? (
            <p className="text-[12px] text-[var(--text-muted)] text-center py-3">Atanacak görev kalmadı.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {unassignedTasks.slice(0, 20).map(task => (
                <button
                  key={task.id}
                  onClick={() => handleAssignTask(task.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--interactive-muted)] hover:bg-[var(--interactive-hover)] transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={task.priority} size="xs">{task.priority}</Badge>
                    <span className="text-[12px] text-[var(--text-primary)] truncate">{task.title}</span>
                  </div>
                  <span className="text-[10px] text-[var(--accent-primary)] font-medium shrink-0 ml-2">+ Ata</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Task List ─── */}
      <div>
        <h3 className="text-[13px] font-bold text-[var(--text-primary)] mb-3">Sprint Görevleri</h3>
        {tasks.length === 0 ? (
          <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-8 text-center">
            <p className="text-[12px] text-[var(--text-muted)]">Bu sprint'e henüz görev atanmamış.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task, i) => (
              <motion.button
                key={task.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-150 ease-[var(--ease-apple)] text-left group"
              >
                {/* Status dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  task.status === 'done' ? 'bg-emerald-500' :
                  task.status === 'in-progress' ? 'bg-amber-500' :
                  task.status === 'testing' ? 'bg-violet-500' :
                  'bg-slate-400'
                }`} />
                {/* Title */}
                <span className={`text-[12px] font-medium flex-1 truncate ${
                  task.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                }`}>
                  {task.title}
                </span>
                {/* Priority */}
                <Badge variant={task.priority} size="xs">{task.priority}</Badge>
                {/* Assignee */}
                {task.assigned_name && (
                  <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">{task.assigned_name}</span>
                )}
                {/* Arrow */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default SprintDetail;
