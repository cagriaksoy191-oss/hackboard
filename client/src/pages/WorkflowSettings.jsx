import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { workflowsAPI } from '../lib/api';
import { Button } from '../components/atoms';
import Badge from '../components/atoms/Badge';
import Spinner from '../components/atoms/Spinner';
import socket from '../lib/socket';

/* ──────────────────────────────────────────────
   DEFAULT_COLORS — Workflow stage color palette
   ────────────────────────────────────────────── */
const STAGE_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#d946ef', '#8b5cf6', '#64748b',
];

/* ──────────────────────────────────────────────
   Add Stage Modal
   ────────────────────────────────────────────── */
function AddStageModal({ show, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (show) { setName(''); setColor('#6366f1'); setIsDone(false); }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), color, is_done_state: isDone });
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
        className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-5 w-full max-w-sm shadow-[var(--shadow-xl)]"
      >
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-4 tracking-tight">Yeni Aşama Ekle</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Aşama Adı</label>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] transition-all duration-150"
              placeholder="Ör: Code Review"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Renk</label>
            <div className="flex flex-wrap gap-1.5">
              {STAGE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all duration-150 ${
                    color === c ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-surface)] scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox" checked={isDone} onChange={(e) => setIsDone(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-primary)] bg-[var(--bg-input)] focus:ring-[var(--accent-primary-muted)]"
            />
            <span className="text-[12px] text-[var(--text-secondary)]">Bu aşama "Tamamlandı" durumunu temsil eder</span>
          </label>
          <div className="flex gap-2.5 pt-1">
            <Button variant="secondary" size="md" onClick={onClose} className="flex-1" type="button">İptal</Button>
            <Button variant="accent" size="md" className="flex-1" type="submit">Ekle</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Stage Row — drag-reorderable
   ────────────────────────────────────────────── */
function StageRow({ stage, onEdit, onDelete, isDeleting }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);

  const handleSave = () => {
    if (editName.trim() && editName.trim() !== stage.name) {
      onEdit(stage.id, { name: editName.trim() });
    }
    setEditing(false);
  };

  return (
    <Reorder.Item
      value={stage}
      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] cursor-grab active:cursor-grabbing hover:border-[var(--border-strong)] transition-all duration-150"
    >
      {/* Drag handle */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--text-muted)] shrink-0">
        <circle cx="9" cy="6" r="1.5" fill="currentColor" />
        <circle cx="15" cy="6" r="1.5" fill="currentColor" />
        <circle cx="9" cy="12" r="1.5" fill="currentColor" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
        <circle cx="9" cy="18" r="1.5" fill="currentColor" />
        <circle cx="15" cy="18" r="1.5" fill="currentColor" />
      </svg>

      {/* Color dot */}
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color || '#6366f1' }} />

      {/* Name */}
      {editing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          className="flex-1 px-2 py-1 rounded-md text-[12px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
      ) : (
        <span
          className="flex-1 text-[12px] font-medium text-[var(--text-primary)] cursor-text"
          onDoubleClick={() => { setEditName(stage.name); setEditing(true); }}
        >
          {stage.name}
        </span>
      )}

      {/* Done state badge */}
      {stage.is_done_state === 1 && (
        <Badge variant="success" size="xs">Bitti</Badge>
      )}

      {/* Slug */}
      <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">{stage.slug}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => { setEditName(stage.name); setEditing(true); }}
          className="p-1 rounded-md hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)] transition-colors"
          title="Düzenle"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(stage.id)}
          disabled={isDeleting}
          className="p-1 rounded-md hover:bg-[var(--accent-danger-muted)] text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] transition-colors disabled:opacity-30"
          title="Sil"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Reorder.Item>
  );
}

/* ──────────────────────────────────────────────
   WorkflowSettings Page
   ────────────────────────────────────────────── */
function WorkflowSettings() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchStages = useCallback(() => {
    workflowsAPI.getAll().then((res) => {
      setStages(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStages();

    const handleCreated = () => fetchStages();
    const handleUpdated = () => fetchStages();
    const handleReordered = (newStages) => setStages(newStages);
    const handleDeleted = () => fetchStages();

    socket.on('workflow:created', handleCreated);
    socket.on('workflow:updated', handleUpdated);
    socket.on('workflow:reordered', handleReordered);
    socket.on('workflow:deleted', handleDeleted);
    return () => {
      socket.off('workflow:created', handleCreated);
      socket.off('workflow:updated', handleUpdated);
      socket.off('workflow:reordered', handleReordered);
      socket.off('workflow:deleted', handleDeleted);
    };
  }, [fetchStages]);

  const handleCreate = async (data) => {
    try {
      await workflowsAPI.create(data);
      setShowAddModal(false);
      fetchStages();
    } catch (err) {
      console.error('Workflow create error:', err);
    }
  };

  const handleEdit = async (id, data) => {
    try {
      await workflowsAPI.update(id, data);
      fetchStages();
    } catch (err) {
      console.error('Workflow edit error:', err);
    }
  };

  const handleDelete = async (id) => {
    setDeleteError('');
    try {
      await workflowsAPI.delete(id);
      fetchStages();
    } catch (err) {
      if (err.response?.status === 409) {
        setDeleteError(`Bu aşamada ${err.response.data.taskCount} görev var. Önce görevleri taşıyın.`);
      } else {
        console.error('Workflow delete error:', err);
      }
    }
  };

  const handleReorder = async (newOrder) => {
    setStages(newOrder);
    const order = newOrder.map((stage, i) => ({ id: stage.id, position: i }));
    const wsId = newOrder[0]?.workspace_id;
    if (wsId) {
      try {
        await workflowsAPI.reorder({ workspace_id: wsId, order });
      } catch (err) {
        console.error('Workflow reorder error:', err);
        fetchStages(); // Rollback
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 max-w-2xl"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">İş Akışı Aşamaları</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            Kanban board kolonlarını özelleştirin. Sürükleyerek sıralama yapabilirsiniz.
          </p>
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowAddModal(true)}>
          + Yeni Aşama
        </Button>
      </div>

      {/* ─── Info card ─── */}
      <div className="rounded-xl bg-[var(--accent-info-muted)] border border-[var(--accent-info)]/10 p-3.5 flex items-start gap-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-info)" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          Aşamaları sürükleyerek Kanban board'daki sıralarını değiştirin.
          "Tamamlandı" olarak işaretlenen aşamalar analitikte tamamlanmış sayılır.
        </p>
      </div>

      {/* ─── Delete Error ─── */}
      <AnimatePresence>
        {deleteError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-lg bg-[var(--accent-danger-muted)] border border-[var(--accent-danger)]/20 p-3 flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            <span className="text-[11px] text-[var(--accent-danger)]">{deleteError}</span>
            <button onClick={() => setDeleteError('')} className="ml-auto text-[var(--accent-danger)] opacity-60 hover:opacity-100">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Stage List ─── */}
      {stages.length === 0 ? (
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-8 text-center">
          <p className="text-[12px] text-[var(--text-muted)]">Henüz iş akışı aşaması tanımlanmamış.</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Varsayılan aşamalar (todo, in-progress, testing, done) kullanılacaktır.</p>
        </div>
      ) : (
        <Reorder.Group axis="y" values={stages} onReorder={handleReorder} className="space-y-1.5">
          {stages.map((stage) => (
            <StageRow
              key={stage.id}
              stage={stage}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={false}
            />
          ))}
        </Reorder.Group>
      )}

      {/* ─── Default stages note ─── */}
      {stages.length > 0 && (
        <p className="text-[10px] text-[var(--text-muted)] text-center">
          {stages.length} aşama tanımlı · Sürükleyerek sıralayın
        </p>
      )}

      {/* ─── Add Modal ─── */}
      <AnimatePresence>
        <AddStageModal
          show={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
        />
      </AnimatePresence>
    </motion.div>
  );
}

export default WorkflowSettings;
