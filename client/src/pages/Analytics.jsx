import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI, tasksAPI } from '../lib/api';
import { useToast } from '../components/Toast';
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

function Analytics() {
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    analyticsAPI.get().then((res) => setData(res.data));
    tasksAPI.getAll().then((res) => setTasks(res.data));
  }, []);

  if (!data) return <div className="text-center py-20 text-gray-400">Yukleniyor...</div>;

  const pieData = formatPieData(data.taskStatusDist);

  const barData = formatBarData(data.tasksByUser);

  const lineData = formatLineData(data.hourlyProductivity);

  const exportJSON = () => handleExportJSON(tasks, addToast);

  const exportCSV = () => handleExportCSV(tasks, addToast);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Analitik Panel</h2>
        <div className="flex gap-2">
          <button
            onClick={exportJSON}
            className="px-4 py-2 bg-accent/20 border border-accent/30 text-accent text-sm font-medium rounded-xl hover:bg-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            JSON Indir
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-accentAlt/20 border border-accentAlt/30 text-accentAlt text-sm font-medium rounded-xl hover:bg-accentAlt/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            CSV Indir
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Genel Ilerleme</h3>
          <span className="text-2xl font-bold text-accent">{data.progress}%</span>
        </div>
        <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-accent to-accentAlt rounded-full"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{data.doneTasks} tamamlandi</span>
          <span>{data.totalTasks} toplam</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Gorev Dagilimi</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                }}
              />
              <Legend
                formatter={(value) => <span className="text-sm text-gray-300">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Kisi Basi Gorev</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                }}
              />
              <Legend
                formatter={(value) => <span className="text-sm text-gray-300">{value}</span>}
              />
              <Bar dataKey="completed" name="Tamamlanan" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="total" name="Toplam" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Saatlik Verimlilik</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData.length > 0 ? lineData : [{ hour: '--:--', completed: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#00d4ff"
                strokeWidth={2}
                dot={{ fill: '#00d4ff', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

export default Analytics;
