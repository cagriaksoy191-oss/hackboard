import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../atoms';

function EditUserModal({
  show,
  onClose,
  onEdit,
  onDelete,
  editingUser,
  formName,
  setFormName,
  showDeleteConfirm,
  setShowDeleteConfirm
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onEdit();
  };

  return (
    <AnimatePresence>
      {show && editingUser && (
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
            {!showDeleteConfirm ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Kullanıcı Düzenle</h2>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 rounded-md bg-[var(--accent-danger-muted)] hover:bg-[var(--accent-danger)] hover:text-white text-[var(--accent-danger)] transition-all duration-150"
                    title="Kullanıcıyı Sil"
                    aria-label="Kullanıcıyı Sil"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Yeni Ad</label>
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
                  <div className="flex gap-2.5 pt-1">
                    <Button variant="secondary" size="md" onClick={onClose} className="flex-1" type="button">İptal</Button>
                    <Button variant="accent" size="md" className="flex-1" type="submit">Kaydet</Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-danger-muted)] flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <h2 className="text-[15px] font-bold text-[var(--accent-danger)]">Emin misiniz?</h2>
                </div>
                <div className="space-y-4">
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                    <strong className="text-[var(--text-primary)]">{editingUser.name}</strong> isimli kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz? O kişiye ait görevler sahipsiz kalacaktır.
                  </p>
                  <div className="flex gap-2.5 pt-1">
                    <Button variant="secondary" size="md" onClick={() => setShowDeleteConfirm(false)} className="flex-1" type="button">İptal</Button>
                    <Button variant="danger" size="md" onClick={onDelete} className="flex-1" type="button">Evet, Sil</Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default EditUserModal;
