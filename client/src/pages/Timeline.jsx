import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { milestonesAPI } from '../lib/api';
import EmptyState from '../components/EmptyState';

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

const formatDateTime = (dateStr) =>
  new Date(dateStr).toLocaleString('tr-TR');

const calculateRange = (milestones) => {
  const start = new Date(milestones[0].target_time);
  const end = new Date(milestones[milestones.length - 1].target_time);
  return { start, totalRange: end - start };
};

const calculatePosition = (dateStr, start, totalRange) =>
  ((new Date(dateStr) - start) / totalRange) * 100;

const getMarkerClasses = (isCompleted, isPast) => {
  const baseClasses =
    'w-5 h-5 rounded-full border-4 cursor-pointer transition-transform group-hover:scale-125';
  if (isCompleted) return `${baseClasses} bg-success border-success/30`;
  if (isPast) return `${baseClasses} bg-warning border-warning/30`;
  return `${baseClasses} surface-bg border-theme`;
};

const getCardClasses = (isCompleted) => {
  const baseClasses = 'glass rounded-2xl p-5 card-hover border-l-4';
  return isCompleted ? `${baseClasses} border-l-success` : `${baseClasses} border-l-accent`;
};

const HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

function Timeline() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    milestonesAPI.getAll().then((res) => {
      setMilestones(res.data);
      setLoading(false);
    });
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-secondary">Yukleniyor...</div>;
  }

  if (milestones.length === 0) {
    return <EmptyState message="Henuz milestone yok" icon="task" />;
  }

  const { start, totalRange } = calculateRange(milestones);
  const nowPos = Math.max(
    0,
    Math.min(100, calculatePosition(now.toISOString(), start, totalRange))
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <h2 className="text-2xl font-bold text-primary">Zaman Cizelgesi</h2>

      <div className="glass rounded-2xl p-6 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="relative h-24 mb-8">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 divider-theme -translate-y-1/2" />

            {milestones.map((ms, i) => {
              const pos = calculatePosition(ms.target_time, start, totalRange);
              const isPast = new Date(ms.target_time) < now;
              const markerClasses = getMarkerClasses(ms.is_completed, isPast);

              return (
                <motion.div
                  key={ms.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="absolute top-1/2 -translate-y-1/2 group"
                  style={{ left: `${pos}%` }}
                >
                  <div className={markerClasses} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="glass-strong rounded-xl p-3 w-48 text-center">
                      <p className="text-sm font-semibold text-primary">{ms.title}</p>
                      <p className="text-xs text-secondary mt-1">{ms.description}</p>
                      <p className="text-xs text-accent mt-1">{formatTime(ms.target_time)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-secondary mt-2 whitespace-nowrap -translate-x-1/2 absolute left-1/2">
                    {ms.title}
                  </p>
                </motion.div>
              );
            })}

            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${nowPos}%` }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
              <div className="absolute top-4 left-2 text-xs text-red-400 font-medium whitespace-nowrap">
                Simdi
              </div>
            </motion.div>
          </div>

          <div className="relative h-8 mt-4">
            <div className="absolute bottom-0 left-0 right-0 flex justify-between">
              {HOURS.map((h) => (
                <span key={h} className="text-xs text-muted">
                  {h}:00
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {milestones.map((ms, i) => (
          <motion.div
            key={ms.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={getCardClasses(ms.is_completed)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-primary">{ms.title}</h4>
              {ms.is_completed && (
                <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                  Tamamlandi
                </span>
              )}
            </div>
            <p className="text-xs text-secondary mb-3">{ms.description}</p>
            <p className="text-xs text-accent">{formatDateTime(ms.target_time)}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default Timeline;
