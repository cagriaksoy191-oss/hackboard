import { useState, useEffect } from 'react';
import { tasksAPI, usersAPI } from '../lib/api';
import socket from '../lib/socket';
import TaskForm from './TaskForm';
import Modal from './common/Modal';

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

  return (
    <Modal title="Gorevi Duzenle" onClose={onClose}>
      <TaskForm
        form={form}
        setForm={setForm}
        users={users}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitText="Kaydet"
      />
    </Modal>
  );
}

export default EditTaskModal;
