import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { publicUsersAPI } from '../lib/api';
import Avatar from './atoms/Avatar';
import { Button } from './atoms';
import Spinner from './atoms/Spinner';
import AddUserModal from './login/AddUserModal';
import EditUserModal from './login/EditUserModal';

const THEME_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#737373', '#a1a1aa'
];

function LoginScreen({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    publicUsersAPI.getAll().then((res) => {
      const sortedUsers = res.data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      setUsers(sortedUsers);
      setLoading(false);
    }).catch((err) => {
      console.error('Fetch users error:', err);
      setError('Kullanıcı profilleri yüklenemedi. Sunucu bağlantısı veya veritabanı başlatma hatası.');
      setLoading(false);
    });
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async (e) => {
    if (e) e.preventDefault();
    if (!formName || !formRole) return;
    let colorToUse = selectedColor;
    if (!colorToUse) {
      const usedColors = users.map(u => u.avatar_color);
      const availableColors = THEME_COLORS.filter(c => !usedColors.includes(c));
      colorToUse = availableColors.length > 0 ? availableColors[0] : THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
    }
    await publicUsersAPI.create({ name: formName, role: formRole, avatar_color: colorToUse });
    setShowAddModal(false); setFormName(''); setFormRole(''); setSelectedColor('');
    fetchUsers();
  };

  const openAddModal = () => {
    const usedColors = users.map(u => u.avatar_color);
    const availableColors = THEME_COLORS.filter(c => !usedColors.includes(c));
    setSelectedColor(availableColors.length > 0 ? availableColors[0] : THEME_COLORS[0]);
    setShowAddModal(true);
  };

  const handleEditUser = async (e) => {
    if (e) e.preventDefault();
    if (!formName || !editingUser) return;
    await publicUsersAPI.update(editingUser.id, { name: formName });
    setShowEditModal(false); setEditingUser(null); setFormName('');
    fetchUsers();
  };

  const handleDeleteUser = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!editingUser) return;
    try {
      await publicUsersAPI.delete(editingUser.id);
      setShowDeleteConfirm(false); setShowEditModal(false); setEditingUser(null);
      if (selectedUser?.id === editingUser.id) setSelectedUser(null);
      fetchUsers();
    } catch (err) { console.error("Delete user failed:", err); }
  };

  const openEditModal = (e, user) => {
    e.stopPropagation();
    setEditingUser(user); setFormName(user.name); setShowDeleteConfirm(false); setShowEditModal(true);
  };

  const handleLogin = () => { if (selectedUser) onLogin(selectedUser); };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-app)]">
      {/* Subtle gradient orbs — Apple-style ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[var(--accent-primary)] opacity-[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[var(--accent-info)] opacity-[0.03] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-[900px] px-4"
      >
        {/* ─── Branding ─── */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--accent-primary)] flex items-center justify-center text-white text-2xl font-bold shadow-[var(--shadow-accent)]"
          >
            H
          </motion.div>
          <h1 className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight mb-1">HackBoard</h1>
          <p className="text-[var(--text-tertiary)] text-[14px]">Enterprise Workflow Platform</p>
          <p className="text-[var(--text-muted)] text-[12px] mt-1.5">Devam etmek için bir profil seçin</p>
        </div>

        {/* ─── User Grid ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-8 px-6 rounded-2xl glass border border-[var(--border-default)] bg-[var(--bg-card)] max-w-sm mx-auto space-y-4 shadow-[var(--shadow-lg)]">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-danger-muted)] border border-[var(--accent-danger)]/15 flex items-center justify-center mx-auto text-[var(--accent-danger)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Bağlantı Hatası</h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{error}</p>
            </div>
            <Button variant="accent" size="md" onClick={fetchUsers} className="w-full">
              Yeniden Dene
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
            {users.map((user, i) => {
              const isSelected = selectedUser?.id === user.id;
              return (
                <motion.button
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  onClick={() => setSelectedUser(user)}
                  className={`
                    relative rounded-xl p-4 text-center
                    border transition-all duration-200 ease-[var(--ease-apple)]
                    group
                    ${isSelected
                      ? 'bg-[var(--accent-primary-subtle)] border-[var(--accent-primary)] shadow-[var(--shadow-accent)]'
                      : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]'
                    }
                  `.trim().replace(/\s+/g, ' ')}
                >
                  {/* Edit Button */}
                  <button
                    onClick={(e) => openEditModal(e, user)}
                    className="absolute top-2 right-2 p-1 rounded-md bg-[var(--interactive-muted)] hover:bg-[var(--interactive-hover)] opacity-0 group-hover:opacity-100 transition-all duration-150 text-[var(--text-tertiary)]"
                    title="Düzenle"
                    aria-label="Kullanıcıyı düzenle"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>

                  {/* Avatar */}
                  <div className="relative inline-block mb-2.5">
                    <Avatar
                      name={user.name}
                      color={user.avatar_color || '#6366f1'}
                      size="lg"
                    />
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[var(--accent-primary)] rounded-full flex items-center justify-center border-2 border-[var(--bg-card)]"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>

                  <h3 className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{user.name}</h3>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{user.role}</p>
                </motion.button>
              );
            })}

            {/* Add User Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * users.length, duration: 0.2 }}
              onClick={openAddModal}
              className="
                rounded-xl p-4 text-center min-h-[120px]
                border border-dashed border-[var(--border-default)]
                bg-[var(--interactive-muted)]
                hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary-subtle)]
                transition-all duration-200 ease-[var(--ease-apple)]
                flex flex-col items-center justify-center
              "
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--text-muted)] flex items-center justify-center mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-[var(--text-tertiary)]">Yeni Kullanıcı</span>
            </motion.button>
          </div>
        )}

        {/* ─── Login Button ─── */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="text-center"
            >
              <Button
                variant="accent"
                size="lg"
                onClick={handleLogin}
                className="px-12"
              >
                Giriş Yap
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      <AddUserModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={() => handleAddUser()}
        formName={formName}
        setFormName={setFormName}
        formRole={formRole}
        setFormRole={setFormRole}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        THEME_COLORS={THEME_COLORS}
        users={users}
      />
      <EditUserModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onEdit={() => handleEditUser()}
        onDelete={handleDeleteUser}
        editingUser={editingUser}
        formName={formName}
        setFormName={setFormName}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />
    </div>
  );
}

export default LoginScreen;
