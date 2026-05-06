import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="relative glass-strong rounded-2xl p-6 w-full max-w-sm"
          >
            {!showDeleteConfirm ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Kullanici Duzenle</h2>
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-red-400 hover:text-red-300 p-1 bg-red-400/10 hover:bg-red-400/20 rounded transition-colors" title="Kullaniciyi Sil" aria-label="Kullaniciyi Sil">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Yeni Ad</label>
                    <input
                      type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent"
                      placeholder="Ad Soyad"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors">Iptal</button>
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
                    <button type="button" onClick={onDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">Evet, Sil</button>
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
