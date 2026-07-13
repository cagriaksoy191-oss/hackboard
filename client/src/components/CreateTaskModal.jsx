import { useState, useEffect } from 'react';
import { tasksAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import TaskForm from './TaskForm';
import Modal from './common/Modal';

function CreateTaskModal({ onClose, onSuccess, isOpen }) {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee_ids: [],
    estimated_hours: '',
    status: 'todo',
    due_date: '',
  });

  useEffect(() => {
    usersAPI.getAll().then((res) => setUsers(res.data));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        description: '',
        priority: 'medium',
        assignee_ids: [],
        estimated_hours: '',
        status: 'todo',
        due_date: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await tasksAPI.create({
      ...form,
      estimated_hours: parseFloat(form.estimated_hours) || 0,
      user_id: user?.id || 1,
    });
    onSuccess();
  };

  return (
    <Modal title="Yeni Gorev Olustur" onClose={onClose} isOpen={isOpen}>
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
