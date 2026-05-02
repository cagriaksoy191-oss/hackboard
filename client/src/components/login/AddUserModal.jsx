import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AddUserModal({ show, onClose, onAdd, formName, setFormName, formRole, setFormRole, selectedColor, setSelectedColor, THEME_COLORS, users }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd();
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="relative glass-strong rounded-2xl p-6 w-full max-w-sm"
          >
            <h2 className="text-xl font-bold text-white mb-4">Yeni Kullanici Ekle</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        className={`relative overflow-hidden w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${isUsed ? 'cursor-not-allowed' : 'hover:scale-110'} ${selectedColor === color && !isUsed ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                        style={{ backgroundColor: color }}
                        title={isUsed ? 'Bu renk baska bir kullanici tarafindan kullaniliyor' : 'Sec'}
                      >
                        {isUsed && (
                          <>
                            <div className="absolute inset-0 bg-black/50" />
                            <div className="absolute w-[120%] h-[4px] bg-[#ff0000] shadow-sm -rotate-45 z-10" />
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors">Iptal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accentAlt transition-colors">Ekle</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AddUserModal;
