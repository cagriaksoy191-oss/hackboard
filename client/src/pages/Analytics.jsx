import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI, tasksAPI } from '../lib/api';
import { useToast } from '../components/Toast';
import { Button } from '../components/atoms';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import {
  formatPieData,
  formatBarData,
  formatLineData,
  exportJSON as handleExportJSON,
  exportCSV as handleExportCSV,
} from '../lib/analyticsHelpers.js';
import Spinner from '../components/atoms/Spinner';

/* ──────────────────────────────────────────────
   Recharts Theme — Design-token aware
   ────────────────────────────────────────────── */
const chartTooltipStyle = {
  backgroundColor: 'var(--bg-surface-3)',
  border: '1px solid var(--border-default)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  boxShadow: 'var(--shadow-lg)',
};

const axisTickStyle = { fill: 'var(--text-tertiary)', fontSize: 11 };
const gridStroke = 'var(--border-subtle)';

/* ──────────────────────────────────────────────
   Analytics Page
   ────────────────────────────────────────────── */
function Analytics() {
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    analyticsAPI.get().then((res) => setData(res.data));
    tasksAPI.getAll().then((res) => setTasks(res.data));
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const pieData = formatPieData(data.taskStatusDist);
  const barData = formatBarData(data.tasksByUser);
  const lineData = formatLineData(data.hourlyProductivity);

  const exportJSON = () => handleExportJSON(tasks, addToast);
  const exportCSV = () => handleExportCSV(tasks, addToast);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Analitik Panel</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportJSON}>
            JSON İndir
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            CSV İndir
          </Button>
        </div>
      </div>

      {/* ─── Progress Card ─── */}
      <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Genel İlerleme</h3>
          <span className="text-2xl font-bold text-[var(--accent-primary)]">{data.progress}%</span>
        </div>
        <div className="w-full h-2 bg-[var(--interactive-muted)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.progress}%` }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full bg-[var(--accent-primary)] rounded-full"
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-[var(--text-tertiary)]">
          <span>{data.doneTasks} tamamlandı</span>
          <span>{data.totalTasks} toplam</span>
        </div>
      </div>

      {/* ─── Charts Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-4">Görev Dağılımı</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend
                formatter={(value) => <span className="text-[11px] text-[var(--text-secondary)]">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-4">Kişi Başı Görev</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" tick={axisTickStyle} />
              <YAxis tick={axisTickStyle} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend
                formatter={(value) => <span className="text-[11px] text-[var(--text-secondary)]">{value}</span>}
              />
              <Bar dataKey="completed" name="Tamamlanan" fill="#22c55e" radius={[5, 5, 0, 0]} />
              <Bar dataKey="total" name="Toplam" fill="#6366f1" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5 lg:col-span-2">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-4">Saatlik Verimlilik</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData.length > 0 ? lineData : [{ hour: '--:--', completed: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="hour" tick={axisTickStyle} />
              <YAxis tick={axisTickStyle} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5, fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

export default Analytics;
