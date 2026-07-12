import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usersAPI, tasksAPI } from '../lib/api';
import Avatar from '../components/atoms/Avatar';
import Badge from '../components/atoms/Badge';

const statusColors = {
  done: 'var(--accent-success)',
  'in-progress': 'var(--accent-warning)',
  testing: '#8b5cf6',
  todo: 'var(--accent-info)',
};

const processUsersData = (users, userTasks) => {
  return users.map((user) => {
    const tasks = userTasks[user.id] || [];
    const completedCount = tasks.filter((t) => t.status === 'done').length;

    return {
      ...user,
      tasksCount: tasks.length,
      completedCount,
    };
  });
};

function Team() {
  const [users, setUsers] = useState([]);
  const [userTasks, setUserTasks] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    usersAPI.getAll().then((res) => setUsers(res.data));
    tasksAPI.getAll().then((res) => {
      const map = {};
      res.data.forEach((t) => {
        if (t.assigned_to) {
          if (!map[t.assigned_to]) map[t.assigned_to] = [];
          map[t.assigned_to].push(t);
        }
      });
      setUserTasks(map);
    });
  }, []);

  const handleUserClick = (user) => {
    setSelectedUser(selectedUser?.id === user.id ? null : user);
  };

  const processedUsers = useMemo(() => processUsersData(users, userTasks), [users, userTasks]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">
      <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Takım Üyeleri</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {processedUsers.map((user, i) => (
          <motion.button
            key={user.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={() => handleUserClick(user)}
            className={`
              w-full text-left rounded-xl p-4
              border transition-all duration-200 ease-[var(--ease-apple)]
              hover:shadow-[var(--shadow-md)]
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)]
              ${selectedUser?.id === user.id
                ? 'bg-[var(--accent-primary-subtle)] border-[var(--accent-primary)] shadow-[var(--shadow-accent)]'
                : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--border-strong)]'
              }
            `.trim().replace(/\s+/g, ' ')}
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                name={user.name}
                color={user.avatar_color || '#6366f1'}
                size="md"
                showStatus
                isOnline={user.is_online}
              />
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{user.name}</h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">{user.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[var(--interactive-muted)] rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-[var(--text-primary)]">{user.tasksCount}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Toplam</p>
              </div>
              <div className="bg-[var(--interactive-muted)] rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-[var(--accent-success)]">{user.completedCount}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Tamamlanan</p>
              </div>
            </div>

            {/* Sleek Apple-style progress bar replacing Recharts */}
            {(() => {
              const percentage = user.tasksCount > 0 ? Math.round((user.completedCount / user.tasksCount) * 100) : 0;
              const progressColor = user.avatar_color || '#6366f1';
              return (
                <div className="space-y-1.5 mt-2">
                  <div className="flex items-center justify-between text-[10px] font-medium">
                    <span className="text-[var(--text-tertiary)]">İlerleme</span>
                    <span className="font-semibold" style={{ color: progressColor }}>%{percentage}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--interactive-muted)] overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-[var(--ease-apple)]"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: progressColor,
                        boxShadow: `0 0 8px ${progressColor}40`,
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </motion.button>
        ))}
      </div>

      {/* Selected User Tasks */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight">
                {selectedUser.name} — Görevleri
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-md hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)] transition-colors duration-150"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-1.5">
              {(userTasks[selectedUser.id] || []).map((task) => (
                <button
                  key={task.id}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--interactive-muted)] hover:bg-[var(--interactive-hover)] transition-colors duration-150 text-left"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: statusColors[task.status] || statusColors.todo }}
                    />
                    <span className="text-[12px] text-[var(--text-primary)]">{task.title}</span>
                  </div>
                  <Badge variant={task.priority} size="xs">
                    {task.priority}
                  </Badge>
                </button>
              ))}
              {(!userTasks[selectedUser.id] || userTasks[selectedUser.id].length === 0) && (
                <p className="text-[12px] text-[var(--text-muted)] text-center py-4">Atanmış görev yok.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Team;
