import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { milestonesAPI } from '../lib/api';
import { EmptyState } from '../components/molecules';
import Spinner from '../components/atoms/Spinner';
import Badge from '../components/atoms/Badge';

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

const formatDateTime = (dateStr) =>
  new Date(dateStr).toLocaleString('tr-TR');

const calculateRange = (milestones) => {
  const start = new Date(milestones[0].target_time);
  const end = new Date(milestones[milestones.length - 1].target_time);
  return { start, totalRange: end - start };
};

const calculatePosition = (dateStr, start, totalRange) => {
  if (totalRange === 0) return 50;
  const pct = ((new Date(dateStr) - start) / totalRange) * 100;
  return 6 + (Math.max(0, Math.min(100, pct)) * 0.88);
};

const getTimelineTicks = (start, totalRange) => {
  const ticks = [];
  for (let i = 0; i < 5; i++) {
    const tickTime = new Date(start.getTime() + (totalRange * (i / 4)));
    ticks.push(tickTime);
  }
  return ticks;
};

// Modal for Creating a new Milestone with task association dropdown
function CreateMilestoneModal({ isOpen, onClose, tasks, sprints, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [taskId, setTaskId] = useState('');
  const [sprintId, setSprintId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !targetTime) return;
    onSave({
      title: title.trim(),
      description,
      target_time: new Date(targetTime).toISOString(),
      task_id: taskId ? parseInt(taskId) : null,
      sprint_id: sprintId ? parseInt(sprintId) : null,
    });
    // Reset
    setTitle('');
    setDescription('');
    setTargetTime('');
    setTaskId('');
    setSprintId('');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" onClick={onClose} />
      
      {/* Container */}
      <div className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 shadow-[var(--shadow-xl)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Yeni Kilometre Taşı</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)] font-medium">Başlık</label>
            <input
              type="text"
              required
              placeholder="Örn: Planlama Toplantısı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)] font-medium">Açıklama</label>
            <textarea
              placeholder="Detaylı açıklama..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] focus:outline-none h-16 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)] font-medium">Hedef Zaman</label>
            <input
              type="datetime-local"
              required
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)] font-medium">İlişkili Görev (Task)</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] focus:outline-none"
            >
              <option value="">Seçilmedi</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)] font-medium">İlişkili Sprint</label>
            <select
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] focus:outline-none"
            >
              <option value="">Seçilmedi</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[var(--interactive-muted)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--interactive-hover)] text-xs font-semibold"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function Timeline() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [timerHours, setTimerHours] = useState(24);
  const [showAddModal, setShowAddModal] = useState(false);
  const activeWorkspaceId = localStorage.getItem('hackboard-active-workspace-id');

  const fetchWorkspaceAndTasks = () => {
    if (!activeWorkspaceId) return;
    import('../lib/api').then(({ workspacesAPI, tasksAPI, sprintsAPI }) => {
      workspacesAPI.getById(activeWorkspaceId).then((res) => {
        setWorkspace(res.data);
        if (res.data?.settings?.timer?.duration_hours) {
          setTimerHours(res.data.settings.timer.duration_hours);
        }
      }).catch(() => {});

      tasksAPI.getAll().then((res) => {
        setTasks(res.data);
      }).catch(() => {});

      sprintsAPI.getAll().then((res) => {
        setSprints(res.data);
      }).catch(() => {});
    });
  };

  const loadMilestonesData = () => {
    milestonesAPI.getAll().then((res) => {
      const dbMilestones = res.data;
      if (dbMilestones.length === 0) {
        setMilestones([]);
        setLoading(false);
        return;
      }

      const lastMsTime = new Date(dbMilestones[dbMilestones.length - 1].target_time);
      const nowClient = new Date();

      if (nowClient > lastMsTime) {
        const lastCompleted = [...dbMilestones].reverse().find(m => m.is_completed === 1);
        const firstIncomplete = dbMilestones.find(m => m.is_completed === 0);

        let estimatedSeedNow;
        if (lastCompleted && firstIncomplete) {
          estimatedSeedNow = new Date((new Date(lastCompleted.target_time).getTime() + new Date(firstIncomplete.target_time).getTime()) / 2);
        } else if (lastCompleted) {
          estimatedSeedNow = new Date(new Date(lastCompleted.target_time).getTime() + 2 * 3600000);
        } else if (firstIncomplete) {
          estimatedSeedNow = new Date(new Date(firstIncomplete.target_time).getTime() - 2 * 3600000);
        } else {
          estimatedSeedNow = new Date(lastMsTime.getTime() - 4 * 3600000);
        }

        const shiftMs = nowClient.getTime() - estimatedSeedNow.getTime();

        const adjusted = dbMilestones.map(m => ({
          ...m,
          target_time: new Date(new Date(m.target_time).getTime() + shiftMs).toISOString()
        }));
        setMilestones(adjusted);
      } else {
        setMilestones(dbMilestones);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadMilestonesData();
    fetchWorkspaceAndTasks();

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [activeWorkspaceId]);

  // Sync with sockets for timer and milestones update
  useEffect(() => {
    if (!activeWorkspaceId) return;
    import('../lib/socket').then(({ default: socket }) => {
      const handleTimerUpdate = (newTimerState) => {
        setWorkspace(prev => prev ? {
          ...prev,
          settings: {
            ...prev.settings,
            timer: newTimerState
          }
        } : null);
      };
      
      const handleMilestonesUpdate = () => {
        loadMilestonesData();
      };

      socket.on('timer:update', handleTimerUpdate);
      socket.on('milestone:created', handleMilestonesUpdate);
      socket.on('milestone:updated', handleMilestonesUpdate);
      socket.on('milestone:deleted', handleMilestonesUpdate);

      return () => {
        socket.off('timer:update', handleTimerUpdate);
        socket.off('milestone:created', handleMilestonesUpdate);
        socket.off('milestone:updated', handleMilestonesUpdate);
        socket.off('milestone:deleted', handleMilestonesUpdate);
      };
    });
  }, [activeWorkspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const emptyIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );

  if (milestones.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title="Henüz kilometre taşı yok"
        description="Projenize kilometre taşı ekleyin."
      />
    );
  }

  const { start, totalRange } = calculateRange(milestones);
  const nowPos = Math.max(0, Math.min(100, calculatePosition(now.toISOString(), start, totalRange)));

  const getMarkerClass = (isCompleted, isPast) => {
    const base = 'w-4 h-4 rounded-full border-[3px] cursor-pointer transition-transform duration-150 group-hover:scale-125';
    if (isCompleted) return `${base} bg-[var(--accent-success)] border-[var(--accent-success-muted)]`;
    if (isPast) return `${base} bg-[var(--accent-warning)] border-[var(--accent-warning-muted)]`;
    return `${base} bg-[var(--bg-surface)] border-[var(--border-strong)]`;
  };

  const handleCreateMilestone = async (milestoneData) => {
    try {
      await milestonesAPI.create(milestoneData);
      loadMilestonesData();
    } catch (err) {
      console.error('Error creating milestone:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Zaman Çizelgesi</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-[11px] font-semibold transition-all duration-150 shadow-[var(--shadow-sm)]"
        >
          Yeni Kilometre Taşı
        </button>
      </div>

      {/* ─── Global Countdown Timer Controls ─── */}
      {workspace && (
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight">Küresel Sayaç Kontrolü</h3>
              <p className="text-[11px] text-[var(--text-tertiary)]">Hackathon genel geri sayım sayacını tüm katılımcılar için yönetin.</p>
            </div>
            <div className="px-3 py-1 rounded-md bg-[var(--interactive-muted)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)]">
              Durum: <span className="font-semibold text-[var(--accent-primary)]">{workspace.settings?.timer?.status === 'active' ? 'Aktif' : workspace.settings?.timer?.status === 'paused' ? 'Durduruldu' : 'Hazır'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-[var(--text-secondary)] font-medium">Süre (Saat):</label>
              <input
                type="number"
                min="1"
                max="168"
                value={timerHours}
                onChange={(e) => setTimerHours(Math.max(1, parseInt(e.target.value) || 24))}
                disabled={workspace.settings?.timer?.status === 'active'}
                className="w-16 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              {workspace.settings?.timer?.status !== 'active' ? (
                <button
                  onClick={async () => {
                    const { workspacesAPI } = await import('../lib/api');
                    await workspacesAPI.startTimer(activeWorkspaceId, { duration_hours: timerHours });
                    fetchWorkspaceAndTasks();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-[11px] font-semibold transition-all duration-150"
                >
                  {workspace.settings?.timer?.status === 'paused' ? 'Devam Et' : 'Zamanı Başlat'}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const { workspacesAPI } = await import('../lib/api');
                    await workspacesAPI.stopTimer(activeWorkspaceId);
                    fetchWorkspaceAndTasks();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent-warning)] hover:bg-[var(--accent-warning-hover)] text-[var(--bg-app)] text-[11px] font-semibold transition-all duration-150"
                >
                  Zamanı Durdur
                </button>
              )}

              <button
                onClick={async () => {
                  const { workspacesAPI } = await import('../lib/api');
                  await workspacesAPI.resetTimer(activeWorkspaceId);
                  fetchWorkspaceAndTasks();
                }}
                className="px-3 py-1.5 rounded-lg bg-[var(--interactive-muted)] hover:bg-[var(--interactive-hover)] text-[var(--text-primary)] text-[11px] font-semibold border border-[var(--border-subtle)] transition-all duration-150"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Timeline Bar ─── */}
      <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="relative h-20 mb-6">
            {/* Track */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[var(--border-default)] -translate-y-1/2" />

            {/* Milestones */}
            {milestones.map((ms, i) => {
              const pos = calculatePosition(ms.target_time, start, totalRange);
              const isPast = new Date(ms.target_time) < now;

              return (
                <motion.div
                  key={ms.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.2 }}
                  className="absolute top-1/2 -translate-y-1/2 group"
                  style={{ left: `${pos}%` }}
                >
                  <div className={getMarkerClass(ms.is_completed, isPast)} />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                    <div className="bg-[var(--bg-surface-3)] border border-[var(--border-default)] rounded-lg p-3 w-44 text-center shadow-[var(--shadow-lg)]">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">{ms.title}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{ms.description}</p>
                      <p className="text-[10px] text-[var(--accent-primary)] font-medium mt-1">{formatTime(ms.target_time)}</p>
                    </div>
                  </div>
                  {/* Label */}
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-2 whitespace-nowrap -translate-x-1/2 absolute left-1/2">
                    {ms.title}
                  </p>
                </motion.div>
              );
            })}

            {/* Now Indicator */}
            <motion.div
              className="absolute top-0 bottom-0 w-[2px] bg-[var(--accent-danger)] z-10"
              style={{ left: `${nowPos}%` }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[var(--accent-danger)] rounded-full" />
              <div className={`absolute top-4 text-[10px] text-[var(--accent-danger)] font-semibold whitespace-nowrap ${
                nowPos > 50 ? 'right-2 text-right' : 'left-2 text-left'
              }`}>
                Şimdi
              </div>
            </motion.div>
          </div>

          {/* Dynamic Timeline Ticks */}
          <div className="relative h-6 mt-2">
            {getTimelineTicks(start, totalRange).map((tick, i) => (
              <span
                key={i}
                className="absolute text-[9px] text-[var(--text-muted)] font-medium -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${6 + (i * 22)}%` }}
              >
                {tick.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Milestone Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {milestones.map((ms, i) => {
          const isCompleted = ms.is_completed;
          const isPast = new Date(ms.target_time) < now;

          return (
            <motion.div
              key={ms.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.2 }}
              className={`
                rounded-xl p-4 border-l-[3px] transition-all duration-200 ease-[var(--ease-apple)]
                bg-[var(--bg-card)] border border-[var(--border-default)]
                hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]
                ${isCompleted ? 'border-l-[var(--accent-success)]' : isPast ? 'border-l-[var(--accent-warning)]' : 'border-l-[var(--accent-primary)]'}
              `.trim().replace(/\s+/g, ' ')}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">{ms.title}</h4>
                {isCompleted === 1 && (
                  <Badge variant="success" size="xs" dot>Tamamlandı</Badge>
                )}
                {isCompleted === 0 && isPast && (
                  <Badge variant="warning" size="xs" dot>Gecikmiş</Badge>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-3 line-clamp-2">{ms.description}</p>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-[11px] text-[var(--accent-primary)] font-medium">{formatDateTime(ms.target_time)}</p>
                {ms.task_id && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--interactive-muted)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] flex items-center gap-1 font-medium">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    Görev #{ms.task_id}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CreateMilestoneModal portal */}
      <CreateMilestoneModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        tasks={tasks}
        sprints={sprints}
        onSave={handleCreateMilestone}
      />
    </motion.div>
  );
}

export default Timeline;
