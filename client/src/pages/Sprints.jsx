import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { sprintsAPI } from '../lib/api';
import { Button } from '../components/atoms';
import Spinner from '../components/atoms/Spinner';
import { EmptyState } from '../components/molecules';
import SprintCard from '../components/organisms/SprintCard';
import socket from '../lib/socket';

/* ──────────────────────────────────────────────
   Create Sprint Modal
   ────────────────────────────────────────────── */
function CreateSprintModal({ show, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (show) {
      const today = new Date();
      const twoWeeks = new Date(today);
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(twoWeeks.toISOString().split('T')[0]);
      setName(''); setGoal('');
    }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    onCreate({ name, goal, start_date: startDate, end_date: endDate });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-5 w-full max-w-md shadow-[var(--shadow-xl)]"
      >
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-4 tracking-tight">Yeni Sprint Oluştur</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Sprint Adı</label>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] transition-all duration-150"
              placeholder="Sprint 1"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Hedef (Opsiyonel)</label>
            <textarea
              value={goal} onChange={(e) => setGoal(e.target.value)} rows={2}
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] transition-all duration-150 resize-none"
              placeholder="Bu sprint'in hedefi..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Başlangıç</label>
              <input
                type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Bitiş</label>
              <input
                type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] transition-all duration-150"
              />
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <Button variant="secondary" size="md" onClick={onClose} className="flex-1" type="button">İptal</Button>
            <Button variant="accent" size="md" className="flex-1" type="submit">Oluştur</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sprints Page
   ────────────────────────────────────────────── */
const STATUS_TABS = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'planning', label: 'Planlama' },
  { key: 'completed', label: 'Tamamlanan' },
];

function Sprints() {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const fetchSprints = () => {
    sprintsAPI.getAll().then((res) => {
      setSprints(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSprints();

    const handleCreated = (sprint) => setSprints(prev => [sprint, ...prev]);
    const handleUpdated = (sprint) => setSprints(prev => prev.map(s => s.id === sprint.id ? sprint : s));

    socket.on('sprint:created', handleCreated);
    socket.on('sprint:updated', handleUpdated);
    return () => {
      socket.off('sprint:created', handleCreated);
      socket.off('sprint:updated', handleUpdated);
    };
  }, []);

  const handleCreate = async (data) => {
    try {
      await sprintsAPI.create(data);
      setShowCreateModal(false);
      fetchSprints();
    } catch (err) {
      console.error('Sprint create error:', err);
    }
  };

  const handleStatusChange = async (sprintId, newStatus) => {
    try {
      await sprintsAPI.updateStatus(sprintId, newStatus);
      fetchSprints();
    } catch (err) {
      console.error('Sprint status error:', err);
    }
  };

  const filteredSprints = useMemo(() => {
    if (activeTab === 'all') return sprints;
    return sprints.filter(s => s.status === activeTab);
  }, [sprints, activeTab]);

  const activeSprint = useMemo(() => sprints.find(s => s.status === 'active'), [sprints]);

  const emptyIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Sprint Yönetimi</h2>
          {activeSprint && (
            <p className="text-[11px] text-[var(--accent-primary)] mt-0.5">
              Aktif: {activeSprint.name}
            </p>
          )}
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowCreateModal(true)}>
          + Yeni Sprint
        </Button>
      </div>

      {/* ─── Status Tabs ─── */}
      <div className="flex gap-1 p-1 bg-[var(--interactive-muted)] rounded-lg w-fit">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-3 py-1.5 rounded-md text-[11px] font-medium
              transition-all duration-150 ease-[var(--ease-apple)]
              ${activeTab === tab.key
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }
            `.trim().replace(/\s+/g, ' ')}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1.5 text-[10px] opacity-60">
                {sprints.filter(s => s.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Sprint Cards ─── */}
      {filteredSprints.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title="Henüz sprint yok"
          description={activeTab !== 'all' ? 'Bu durumda sprint bulunamadı.' : 'İlk sprint\'inizi oluşturarak başlayın.'}
          actionLabel={activeTab === 'all' ? 'Sprint Oluştur' : undefined}
          onAction={activeTab === 'all' ? () => setShowCreateModal(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filteredSprints.map((sprint, i) => (
              <motion.div
                key={sprint.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
              >
                <SprintCard
                  sprint={sprint}
                  isActive={sprint.status === 'active'}
                  onClick={() => navigate(`/sprints/${sprint.id}`)}
                  onStatusChange={(status) => handleStatusChange(sprint.id, status)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Create Modal ─── */}
      <AnimatePresence>
        <CreateSprintModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      </AnimatePresence>
    </motion.div>
  );
}

export default Sprints;
