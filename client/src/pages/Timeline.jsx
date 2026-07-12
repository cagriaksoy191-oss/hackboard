import React, { useState, useEffect } from 'react';
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

function Timeline() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
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

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Zaman Çizelgesi</h2>

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
              <p className="text-[11px] text-[var(--accent-primary)] font-medium">{formatDateTime(ms.target_time)}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default Timeline;
