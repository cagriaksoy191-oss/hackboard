import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { activitiesAPI } from '../lib/api';
import socket from '../lib/socket';
import ActivityItem from './organisms/ActivityItem';
import { EmptyState } from './molecules';

/* ──────────────────────────────────────────────
   ActivityFeed — Live activity stream
   Uses ActivityItem organism
   ────────────────────────────────────────────── */
function ActivityFeed() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    activitiesAPI.getAll().then((res) => setActivities(res.data));

    const handleActivityNew = (activity) => {
      setActivities((prev) => [activity, ...prev]);
    };

    socket.on('activity:new', handleActivityNew);
    return () => socket.off('activity:new', handleActivityNew);
  }, []);

  const emptyIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );

  return (
    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <h3 className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight">
          Canlı Aktivite
        </h3>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-success)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-success)]" />
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activities.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title="Henüz aktivite yok"
            description="Görev değişiklikleri burada görünecek."
            compact
          />
        ) : (
          <AnimatePresence>
            {activities.slice(0, 30).map((activity, i) => (
              <motion.div
                key={activity.id || i}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <ActivityItem activity={activity} compact />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;
