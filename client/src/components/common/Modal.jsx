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
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

function Modal({ title, onClose, children, isOpen }) {
  const modalRef = useRef(null);

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
          key="modal-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          <motion.div
            key="overlay"
            variants={overlayVariants}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            key="modal"
            role="dialog"
            aria-modal="true"
            variants={modalVariants}
            className="relative glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover-surface-bg-hover text-tertiary hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Kapat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;
