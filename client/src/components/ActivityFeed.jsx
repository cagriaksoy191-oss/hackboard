import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { activitiesAPI } from '../lib/api';
import socket from '../lib/socket';

const actionIcons = {
  completed: 'M5 13l4 4L19 7',
  started: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
  created: 'M12 4v16m8-8H4',
  moved: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
  commented: 'M7 8h10M7 12h4m5 4H7a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2z',
  updated: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
};

const actionColors = {
  completed: 'text-success',
  started: 'text-accent',
  created: 'text-accentAlt',
  moved: 'text-warning',
  commented: 'text-gray-300',
  updated: 'text-accent',
};

function ActivityFeed() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    activitiesAPI.getAll().then((res) => setActivities(res.data));

    socket.on('activity:new', (activity) => {
      setActivities((prev) => [activity, ...prev]);
    });

    return () => socket.off('activity:new');
  }, []);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Az once';
    if (diff < 3600) return `${Math.floor(diff / 60)}dk once`;
    return `${Math.floor(diff / 3600)}s once`;
  };

  return (
    <div className="glass rounded-2xl p-5 h-full overflow-hidden flex flex-col">
      <h3 className="text-lg font-bold text-white mb-4">Canli Aktivite</h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <AnimatePresence>
          {activities.slice(0, 20).map((activity, i) => (
            <motion.div
              key={activity.id || i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                activity.avatar_color ? 'bg-opacity-20' : 'bg-accent/20'
              }`} style={{ backgroundColor: activity.avatar_color ? activity.avatar_color + '33' : '#00d4ff33' }}>
                <svg className={`w-4 h-4 ${actionColors[activity.action] || 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={actionIcons[activity.action] || actionIcons.updated} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="font-semibold">{activity.name || 'Sistem'}</span>
                  <span className="text-gray-400"> {activity.action}</span>
                </p>
                <p className="text-xs text-gray-500 truncate">{activity.details}</p>
                <p className="text-xs text-gray-600 mt-1">{formatTime(activity.created_at)}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ActivityFeed;
