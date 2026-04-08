import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass-strong rounded-2xl p-6 w-full max-w-sm pointer-events-auto">
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
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default ConfirmModal;
