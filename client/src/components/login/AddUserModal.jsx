import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../atoms';

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
            <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-4 tracking-tight">Yeni Kullanıcı Ekle</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Ad Soyad</label>
                <input
                  type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="
                    w-full px-3.5 py-2.5 rounded-lg text-[13px]
                    bg-[var(--bg-input)] border border-[var(--border-input)]
                    text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                    focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)]
                    transition-all duration-150 ease-[var(--ease-apple)]
                  "
                  placeholder="Ad Soyad"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Rol</label>
                <input
                  type="text" required value={formRole} onChange={(e) => setFormRole(e.target.value)}
                  className="
                    w-full px-3.5 py-2.5 rounded-lg text-[13px]
                    bg-[var(--bg-input)] border border-[var(--border-input)]
                    text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                    focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)]
                    transition-all duration-150 ease-[var(--ease-apple)]
                  "
                  placeholder="Ör: Developer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-2 uppercase tracking-wider">Profil Rengi</label>
                <div className="flex flex-wrap gap-1.5">
                  {THEME_COLORS.map(color => {
                    const isUsed = users.some(u => u.avatar_color === color);
                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={isUsed}
                        onClick={() => setSelectedColor(color)}
                        className={`
                          relative overflow-hidden w-7 h-7 rounded-full
                          transition-all duration-150 ease-[var(--ease-apple)]
                          flex items-center justify-center
                          ${isUsed ? 'cursor-not-allowed opacity-30' : 'hover:scale-110'}
                          ${selectedColor === color && !isUsed ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-surface)]' : ''}
                        `.trim().replace(/\s+/g, ' ')}
                        style={{ backgroundColor: color }}
                        title={isUsed ? 'Bu renk kullanılıyor' : 'Seç'}
                      >
                        {isUsed && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2.5 pt-1">
                <Button variant="secondary" size="md" onClick={onClose} className="flex-1" type="button">İptal</Button>
                <Button variant="accent" size="md" className="flex-1" type="submit">Ekle</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AddUserModal;
