import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import { useBackupActions } from '../hooks/useBackupActions';

function BackupMenu() {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const {
    loading,
    importModalOpen,
    restoreModalOpen,
    pendingImportData,
    setImportModalOpen,
    setRestoreModalOpen,
    handleExport,
    handleFileSelect,
    handleImportConfirm,
    handleRestoreConfirm,
    handleManualSnapshot,
    resetModals
  } = useBackupActions({ addToast, setOpen });

  const totalRecords = pendingImportData?.meta?.totalRecords || 0;
  const tableCounts = pendingImportData?.meta?.tableCounts || {};
  const exportedAt = pendingImportData?.exportedAt || '';
  const formattedDate = exportedAt ? new Date(exportedAt).toLocaleString('tr-TR') : '';

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover-surface-bg text-secondary hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95"
          title="Yedekleme"
          aria-label="Yedekleme Menusu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100]"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-xl border border-theme shadow-xl z-[110] overflow-hidden"
              >
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="w-full px-4 py-3 text-left text-sm text-secondary hover-surface-bg hover:text-primary transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Yedek Indir
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full px-4 py-3 text-left text-sm text-secondary hover-surface-bg hover:text-primary transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Yedek Yukle
                </button>
                <button
                  onClick={handleManualSnapshot}
                  disabled={loading}
                  className="w-full px-4 py-3 text-left text-sm text-secondary hover-surface-bg hover:text-primary transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Local Snapshot Al
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <ConfirmModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onConfirm={handleImportConfirm}
        title="Yedek Dosyasi Kontrolu"
        message={
          formattedDate
            ? "Bu yedek " + formattedDate + " tarihinde alinmis. Toplam " + totalRecords + " kayit iceriyor. Devam etmek uzere geri yukleme onay ekranina yonlendirileceksiniz."
            : "Toplam " + totalRecords + " kayit iceren bir yedek dosyasi secildi. Devam etmek uzere geri yukleme onay ekranina yonlendirileceksiniz."
        }
      />

      <ConfirmModal
        isOpen={restoreModalOpen}
        onClose={resetModals}
        onConfirm={handleRestoreConfirm}
        title="Dikkat: Geri Yukleme Onayi"
        message={
          'Mevcut sunucu verisi tamamen silinecek ve yedekten geri yuklenecek. Bu islem geri alinamaz ve diger ekip uyelerini de etkileyecek. ' +
          (formattedDate ? 'Yedek tarihi: ' + formattedDate + '. ' : '') +
          (totalRecords > 0 ? 'Toplam ' + totalRecords + ' kayit geri yuklenecek. ' : '') +
          (Object.keys(tableCounts).length > 0
            ? 'Tablolar: ' + Object.entries(tableCounts).map(([k, v]) => k + ': ' + v).join(', ')
            : '')
        }
      />
    </>
  );
}

export default BackupMenu;
