import { useState, useEffect } from 'react';
import { tasksAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import TaskForm from './TaskForm';
import Modal from './common/Modal';

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

  return (
    <Modal title="Yeni Gorev Olustur" onClose={onClose}>
      <TaskForm
        form={form}
        setForm={setForm}
        users={users}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitText="Olustur"
      />
    </Modal>
  );
}

export default CreateTaskModal;
