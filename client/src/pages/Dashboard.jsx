import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { tasksAPI } from '../lib/api';
import StatCard from '../components/StatCard';
import KanbanBoard from '../components/KanbanBoard';
import ActivityFeed from '../components/ActivityFeed';
import socket from '../lib/socket';
import { calculateTaskStats } from '../lib/taskStats';

const STAT_CARDS_CONFIG = [
  {
    id: 'total',
    title: 'Toplam Gorev',
    color: 'bg-accent/20',
    delay: 0,
    kanbanCol: 'top',
    icon: (
      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'done',
    title: 'Tamamlanan',
    color: 'bg-success/20',
    delay: 0.1,
    kanbanCol: 'done',
    icon: (
      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    id: 'inProgress',
    title: 'Devam Eden',
    color: 'bg-warning/20',
    delay: 0.2,
    kanbanCol: 'in-progress',
    icon: (
      <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'todo',
    title: 'Bekleyen',
    color: 'bg-accentAlt/20',
    delay: 0.3,
    kanbanCol: 'todo',
    icon: (
      <svg className="w-5 h-5 text-accentAlt" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];


function Dashboard() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    tasksAPI.getAll().then((res) => {
      setTasks(res.data);
    });

    // ⚡ Bolt Optimization: Calculate derived stats directly from cached task state on
    // real-time events instead of forcing a full tasksAPI.getAll() fetch on every change.
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
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS_CONFIG.map((config) => (
          <StatCard
            key={config.id}
            title={config.title}
            value={stats[config.id]}
            color={config.color}
            delay={config.delay}
            onClick={() => scrollToKanban(config.kanbanCol)}
            icon={config.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <KanbanBoard />
        </div>
        <div className="xl:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;
