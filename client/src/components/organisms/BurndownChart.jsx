import React, { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

/* ──────────────────────────────────────────────
   BurndownChart — Sprint burndown visualization
   Shows ideal vs actual remaining tasks over time
   ────────────────────────────────────────────── */
function BurndownChart({ sprint, tasks }) {
  const data = useMemo(() => {
    if (!sprint?.start_date || !sprint?.end_date || !tasks?.length) return [];

    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalTasks = tasks.length;

    if (totalDays <= 0) return [];

    const points = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Build completed-by-date map
    const completedByDate = {};
    tasks.forEach(t => {
      if (t.status === 'done' && t.updated_at) {
        const dateKey = new Date(t.updated_at).toISOString().split('T')[0];
        completedByDate[dateKey] = (completedByDate[dateKey] || 0) + 1;
      }
    });

    let cumulativeCompleted = 0;

    for (let d = 0; d <= totalDays; d++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + d);
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayLabel = currentDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

      // Ideal burndown — linear from totalTasks to 0
      const ideal = Math.round(totalTasks - (totalTasks / totalDays) * d);

      // Actual burndown — only up to today
      if (currentDate <= today) {
        cumulativeCompleted += (completedByDate[dateKey] || 0);
        const actual = totalTasks - cumulativeCompleted;
        points.push({ day: dayLabel, ideal: Math.max(0, ideal), actual: Math.max(0, actual) });
      } else {
        points.push({ day: dayLabel, ideal: Math.max(0, ideal), actual: null });
      }
    }

    return points;
  }, [sprint, tasks]);

  if (data.length === 0) return null;

  const chartTooltipStyle = {
    backgroundColor: 'var(--bg-surface-3)',
    border: '1px solid var(--border-default)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    boxShadow: 'var(--shadow-lg)',
  };

  return (
    <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Burndown Grafiği</h3>
        <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-[2px] bg-[var(--text-muted)] inline-block" style={{ borderTop: '2px dashed var(--text-muted)' }} />
            İdeal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-[2px] bg-[var(--accent-primary)] inline-block rounded" />
            Gerçek
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="day"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
            interval={Math.max(0, Math.floor(data.length / 7))}
          />
          <YAxis
            tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
            allowDecimals={false}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          {/* Ideal line — dashed */}
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            name="İdeal"
          />
          {/* Actual line — solid accent */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ fill: '#6366f1', r: 2.5 }}
            activeDot={{ r: 4, fill: '#6366f1' }}
            name="Gerçek"
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BurndownChart;
