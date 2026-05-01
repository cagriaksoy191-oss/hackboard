import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { tasksAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import TaskForm from './TaskForm';

function CreateTaskModal({ onClose, onSuccess }) {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    estimated_hours: '',
    status: 'todo',
  });

  useEffect(() => {
    usersAPI.getAll().then((res) => setUsers(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await tasksAPI.create({
      ...form,
      assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
      estimated_hours: parseFloat(form.estimated_hours) || 0,
      user_id: user?.id || 1,
    });
    onSuccess();
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
          <h2 className="text-xl font-bold text-primary">Yeni Gorev Olustur</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover-surface-bg-hover text-tertiary hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <TaskForm
          form={form}
          setForm={setForm}
          users={users}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitText="Olustur"
        />
      </motion.div>
    </div>,
    document.body
  );
}

export default CreateTaskModal;
