import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
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
  const modalRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onEdit();
  };

  useEffect(() => {
    const container = modalRef.current;
    if (!container) return;

    const focusableSelector = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
    let focusableElements = Array.from(container.querySelectorAll(focusableSelector));

    const isTopmost = () => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      return dialogs.length === 0 || dialogs[dialogs.length - 1] === container;
    };

    const timer = setTimeout(() => {
      if (!isTopmost()) return;
      focusableElements = Array.from(container.querySelectorAll(focusableSelector));
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }, 100);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isTopmost()) onClose();
        return;
      }

      if (e.key !== 'Tab') return;
      if (!isTopmost()) return;

      focusableElements = Array.from(container.querySelectorAll(focusableSelector));
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    const handleFocus = (e) => {
      if (!isTopmost()) return;
      focusableElements = Array.from(container.querySelectorAll(focusableSelector));
      if (focusableElements.length > 0 && !container.contains(e.target)) {
        focusableElements[0].focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focus', handleFocus, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focus', handleFocus, true);
    };
  }, [show, onClose]);

  if (!show || !editingUser) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        key="edit-user-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        key="edit-user-modal"
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
    </div>,
    document.body
  );
}

export default EditUserModal;
