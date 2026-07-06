import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { 
    opacity: 0,
    transition: { when: "afterChildren", duration: 0.2 }
  }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }
};

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
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
        if (isTopmost()) {
          onClose();
        }
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
  }, [isOpen]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-modal-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          <motion.div
            key="overlay"
            variants={overlayVariants}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            variants={modalVariants}
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div ref={modalRef} role="dialog" aria-modal="true" className="glass-strong rounded-2xl p-6 w-full max-w-sm pointer-events-auto">
              <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
              <p className="text-sm text-secondary mb-6">{message}</p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 surface-bg border border-theme rounded-xl text-primary hover-surface-bg-hover transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Hayir
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-500 font-medium rounded-xl hover:bg-red-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Evet
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default ConfirmModal;
