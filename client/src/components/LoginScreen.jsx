import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usersAPI } from '../lib/api';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchUsers = () => {
    usersAPI.getAll().then((res) => {
      const sortedUsers = res.data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      setUsers(sortedUsers);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!formName || !formRole) return;
    
    let colorToUse = selectedColor;
    if (!colorToUse) {
      const usedColors = users.map(u => u.avatar_color);
      const availableColors = THEME_COLORS.filter(c => !usedColors.includes(c));
      colorToUse = availableColors.length > 0 ? availableColors[0] : THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
    }
    
    await usersAPI.create({ name: formName, role: formRole, avatar_color: colorToUse });
    setShowAddModal(false);
    setFormName('');
    setFormRole('');
    setSelectedColor('');
    fetchUsers();
  };

  const openAddModal = () => {
    const usedColors = users.map(u => u.avatar_color);
    const availableColors = THEME_COLORS.filter(c => !usedColors.includes(c));
    setSelectedColor(availableColors.length > 0 ? availableColors[0] : THEME_COLORS[0]);
    setShowAddModal(true);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!formName || !editingUser) return;
    await usersAPI.update(editingUser.id, { name: formName });
    setShowEditModal(false);
    setEditingUser(null);
    setFormName('');
    fetchUsers();
  };

  const handleDeleteUser = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingUser) return;
    
    try {
      await usersAPI.delete(editingUser.id);
      setShowDeleteConfirm(false);
      setShowEditModal(false);
      setEditingUser(null);
      if (selectedUser?.id === editingUser.id) setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Delete user failed:", err);
    }
  };

  const openEditModal = (e, user) => {
    e.stopPropagation();
    setEditingUser(user);
    setFormName(user.name);
    setShowDeleteConfirm(false);
    setShowEditModal(true);
  };

  const handleLogin = () => {
    if (selectedUser) {
      onLogin(selectedUser);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accentAlt/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-[1800px] px-4"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-accentAlt flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-accent/20"
          >
            H
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">HackBoard</h1>
          <p className="text-gray-400 text-lg">Hackathon Yonetim Paneli</p>
          <p className="text-gray-500 text-sm mt-2">Devam etmek icin bir kullanici secin</p>
        </div>

        {loading ? (
          <div className="flex flex-wrap justify-center gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full sm:w-[280px] glass rounded-2xl p-6 animate-pulse">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10" />
                <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {users.map((user, i) => {
              const initials = user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
              const isSelected = selectedUser?.id === user.id;
              return (
                <motion.button
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full sm:w-[280px] relative glass rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03] group ${
                    isSelected
                      ? 'border-accent/50 shadow-lg shadow-accent/10 bg-accent/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <button
                    onClick={(e) => openEditModal(e, user)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Duzenle"
                  >
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <div className="relative inline-block mb-3">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white mx-auto"
                      style={{ backgroundColor: user.avatar_color || '#7c3aed' }}
                    >
                      {initials}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm">{user.name}</h3>
                  <p className="text-gray-400 text-xs mt-1">{user.role}</p>
                </motion.button>
              );
            })}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * users.length }}
              onClick={openAddModal}
              className="w-full sm:w-[280px] glass rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03] border-white/10 hover:border-white/20 border-dashed flex flex-col items-center justify-center min-h-[160px]"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-gray-300 font-semibold text-sm">Yeni Kullanici Ekle</h3>
            </motion.button>
          </div>
        )}

        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="text-center"
            >
              <button
                onClick={handleLogin}
                className="px-12 py-3 bg-gradient-to-r from-accent to-accentAlt text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
              >
                Giris Yap
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative glass-strong rounded-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-xl font-bold text-white mb-4">Yeni Kullanici Ekle</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Ad Soyad</label>
                  <input
                    type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent"
                    placeholder="Ad Soyad"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Rol</label>
                  <input
                    type="text" required value={formRole} onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent"
                    placeholder="Orn: Developer"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Profil Rengi</label>
                  <div className="flex flex-wrap gap-2">
                    {THEME_COLORS.map(color => {
                      const isUsed = users.some(u => u.avatar_color === color);
                      return (
                        <button
                          key={color}
                          type="button"
                          disabled={isUsed}
                          onClick={() => setSelectedColor(color)}
                          className={`relative overflow-hidden w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${isUsed ? 'opacity-60 cursor-not-allowed' : 'hover:scale-110'} ${selectedColor === color && !isUsed ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                          style={{ backgroundColor: color }}
                          title={isUsed ? 'Bu renk baska bir kullanici tarafindan kullaniliyor' : 'Sec'}
                        >
                          {isUsed && (
                            <div className="absolute w-[120%] h-1 bg-red-600 shadow-sm -rotate-45" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors">Iptal</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accentAlt transition-colors">Ekle</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative glass-strong rounded-2xl p-6 w-full max-w-sm"
            >
              {!showDeleteConfirm ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Kullanici Duzenle</h2>
                    <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-red-400 hover:text-red-300 p-1 bg-red-400/10 hover:bg-red-400/20 rounded transition-colors" title="Kullaniciyi Sil">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <form onSubmit={handleEditUser} className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Yeni Ad</label>
                      <input
                        type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent"
                        placeholder="Ad Soyad"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors">Iptal</button>
                      <button type="submit" className="flex-1 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accentAlt transition-colors">Kaydet</button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-red-400">Emin misiniz?</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-300">
                      <strong className="text-white">{editingUser.name}</strong> isimli kullaniciyi kalici olarak silmek istediginize emin misiniz? O kisiye ait gorevler sahipsiz kalacaktir.
                    </p>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors">Iptal</button>
                      <button type="button" onClick={handleDeleteUser} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">Evet, Sil</button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LoginScreen;
