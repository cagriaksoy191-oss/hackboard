import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { backupAPI } from '../lib/api';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';

function getRecoveryDetails(snapshot, serverHealth) {
  const snapTotal = snapshot.meta?.totalRecords || 0;
  const serverTotal = serverHealth.totalRecords || 0;
  const snapDate = snapshot.exportedAt ? new Date(snapshot.exportedAt).toLocaleString("tr-TR") : "Bilinmiyor";
  const serverLooksSeed = serverHealth.looksLikeSeedData || false;

  const warningText = serverLooksSeed
    ? "Sunucuda sadece ornek veri gorunuyor. Local snapshot'unuzda " + snapTotal + " kayit var. Geri yuklemek ister misiniz?"
    : "Local snapshot sunucudan farkli veri iceriyor. Snapshot: " + snapTotal + " kayit (" + snapDate + "), Sunucu: " + serverTotal + " kayit.";

  const tableSummary = snapshot.meta?.tableCounts
    ? Object.entries(snapshot.meta.tableCounts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => k + ': ' + v)
        .join(', ')
    : '';

  return { snapTotal, serverTotal, snapDate, warningText, tableSummary };
}

function RecoveryBanner({ snapshot, serverHealth, onDismiss }) {
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (!snapshot || !serverHealth) {
    return null;
  }

  const { snapTotal, snapDate, warningText, tableSummary } = getRecoveryDetails(snapshot, serverHealth);

  const handleRestore = async () => {
    try {
      setLoading(true);
      setRestoreModalOpen(false);
      const res = await backupAPI.importData(snapshot);
      addToast("Snapshot'tan geri yuklendi (" + res.data.totalRecords + " kayit)", "success");
    } catch (error) {
      const msg = error.response?.data?.error || "Geri yukleme sirasinda hata olustu";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-warning/10 border-b border-warning/20 px-6 py-3"
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-warning">Veri Uyusmazligi Algilandi</span>
          </div>
          <p className="text-xs text-gray-400 flex-1">
            {warningText}
            {tableSummary && (
              <span className="block mt-1 text-gray-500">Snapshot icerigi: {tableSummary}</span>
            )}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setRestoreModalOpen(true)}
              disabled={loading}
              className="px-4 py-1.5 bg-warning/20 border border-warning/30 text-warning text-xs font-medium rounded-lg hover:bg-warning/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Yukleniyor...' : 'Geri Yukle'}
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-1.5 bg-white/5 border border-white/10 text-gray-400 text-xs font-medium rounded-lg hover:bg-white/10 hover:text-gray-300 transition-all duration-200"
            >
              Yoksay
            </button>
          </div>
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        onConfirm={handleRestore}
        title="Dikkat: Snapshot'tan Geri Yukleme"
        message={
          "Mevcut sunucu verisi tamamen silinecek ve local snapshot'tan geri yuklenecek. Bu islem geri alinamaz ve diger ekip uyelerini de etkileyecek. " +
          "Snapshot tarihi: " + snapDate + ". Toplam " + snapTotal + " kayit geri yuklenecek."
        }
      />
    </>
  );
}

export default RecoveryBanner;
