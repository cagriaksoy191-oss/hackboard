import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { tasksAPI, usersAPI } from '../lib/api';
import socket from '../lib/socket';

function EditTaskModal({ task, onClose, onSuccess }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    estimated_hours: '',
  });

  useEffect(() => {
    usersAPI.getAll().then((res) => setUsers(res.data));
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || '',
        estimated_hours: task.estimated_hours || '',
      });
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.update(task.id, {
        ...form,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        estimated_hours: parseFloat(form.estimated_hours) || 0,
      });
      socket.emit('task:update', { id: task.id, ...form });
      onSuccess();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        onSuccess();
      }
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">Gorevi Duzenle</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover-surface-bg-hover text-tertiary hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Baslik *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200"
              placeholder="Gorev basligi..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Aciklama</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 resize-none"
              placeholder="Gorev aciklamasi..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Oncelik</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent transition-all duration-200"
              >
                <option value="low" className="option-surface">Dusuk</option>
                <option value="medium" className="option-surface">Orta</option>
                <option value="high" className="option-surface">Yuksek</option>
                <option value="critical" className="option-surface">Kritik</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Tahmini Sure (saat)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.estimated_hours}
                onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent transition-all duration-200"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Atanan Kisi</label>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full px-4 py-2.5 input-surface border-theme rounded-xl focus:outline-none focus:border-accent transition-all duration-200"
            >
              <option value="" className="option-surface">Seciniz</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="option-surface">{u.name} - {u.role}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 surface-bg border border-theme rounded-xl text-primary hover-surface-bg-hover transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Iptal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-accent to-accentAlt text-white font-medium rounded-xl hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Kaydet
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

export default EditTaskModal;
