import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { tasksAPI } from '../lib/api';
import StatCard from '../components/StatCard';
import KanbanBoard from '../components/KanbanBoard';
import ActivityFeed from '../components/ActivityFeed';
import socket from '../lib/socket';

function Dashboard() {
  const [stats, setStats] = useState({ total: 0, done: 0, inProgress: 0, todo: 0 });

  const loadStats = () => {
    tasksAPI.getAll().then((res) => {
      const tasks = res.data;
      setStats({
        total: tasks.length,
        done: tasks.filter((t) => t.status === 'done').length,
        inProgress: tasks.filter((t) => t.status === 'in-progress').length,
        todo: tasks.filter((t) => t.status === 'todo').length,
      });
    });
  };

  useEffect(() => {
    loadStats();

    const handleTaskChange = () => loadStats();

    socket.on('task:created', handleTaskChange);
    socket.on('task:updated', handleTaskChange);
    socket.on('task:moved', handleTaskChange);
    socket.on('task:deleted', handleTaskChange);

    return () => {
      socket.off('task:created', handleTaskChange);
      socket.off('task:updated', handleTaskChange);
      socket.off('task:moved', handleTaskChange);
      socket.off('task:deleted', handleTaskChange);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Gorev"
          value={stats.total}
          color="bg-accent/20"
          delay={0}
          icon={<svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          title="Tamamlanan"
          value={stats.done}
          color="bg-success/20"
          delay={0.1}
          icon={<svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        />
        <StatCard
          title="Devam Eden"
          value={stats.inProgress}
          color="bg-warning/20"
          delay={0.2}
          icon={<svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Bekleyen"
          value={stats.todo}
          color="bg-accentAlt/20"
          delay={0.3}
          icon={<svg className="w-5 h-5 text-accentAlt" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
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
