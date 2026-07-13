import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { tasksAPI } from '../lib/api';
import KanbanBoard from '../components/KanbanBoard';
import ActivityFeed from '../components/ActivityFeed';
import { StatMetric } from '../components/molecules';
import socket from '../lib/socket';
import { calculateTaskStats } from '../lib/taskStats';

/* ──────────────────────────────────────────────
   Stat Card Config — Apple-style clean icons
   ────────────────────────────────────────────── */
const STAT_CARDS = [
  {
    id: 'total',
    title: 'Toplam Görev',
    kanbanCol: 'top',
    accent: 'var(--accent-primary)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    id: 'done',
    title: 'Tamamlanan',
    kanbanCol: 'done',
    accent: 'var(--accent-success)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
  {
    id: 'inProgress',
    title: 'Devam Eden',
    kanbanCol: 'in-progress',
    accent: 'var(--accent-warning)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    id: 'todo',
    title: 'Bekleyen',
    kanbanCol: 'todo',
    accent: 'var(--accent-info)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
    ),
  },
];

/* ──────────────────────────────────────────────
   Stat Card — Apple-style glass card with metric
   ────────────────────────────────────────────── */
function DashboardStatCard({ config, value, onClick, delay }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={onClick}
      className="
        w-full text-left rounded-xl p-4
        bg-[var(--bg-card)] border border-[var(--border-default)]
        hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)]
        hover:shadow-[var(--shadow-md)]
        transition-all duration-200 ease-[var(--ease-apple)]
        group
      "
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          {config.title}
        </span>
        <div className="w-9 h-9 rounded-lg bg-[var(--interactive-muted)] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          {config.icon}
        </div>
      </div>
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: delay + 0.15, type: 'spring', stiffness: 200 }}
        className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-none block"
      >
        {value}
      </motion.span>
    </motion.button>
  );
}

/* ──────────────────────────────────────────────
   Dashboard Page
   ────────────────────────────────────────────── */
function Dashboard() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    tasksAPI.getAll()
      .then((res) => setTasks(res.data))
      .catch((err) => console.error('Dashboard tasks load failed:', err));

    // ⚡ Optimistic updates from socket
    const handleTaskCreated = (newTask) => setTasks((prev) => [newTask, ...prev]);
    const handleTaskUpdated = (updatedTask) => setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    const handleTaskDeleted = (data) => setTasks((prev) => prev.filter((t) => t.id !== data.id));

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, []);

  const stats = useMemo(() => calculateTaskStats(tasks), [tasks]);

  const scrollToKanban = (colId) => {
    const elId = colId === 'top' ? 'kanban-board-container' : `kanban-col-${colId}`;
    const el = document.getElementById(elId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col overflow-hidden space-y-6"
    >
      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {STAT_CARDS.map((config, i) => (
          <DashboardStatCard
            key={config.id}
            config={config}
            value={stats[config.id]}
            delay={i * 0.08}
            onClick={() => scrollToKanban(config.kanbanCol)}
          />
        ))}
      </div>

      {/* ─── Kanban + Activity ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-[78fr_22fr] gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <KanbanBoard />
        </div>
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
          <ActivityFeed />
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;
