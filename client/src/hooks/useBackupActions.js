import { useState } from 'react';
import { backupAPI } from '../lib/api.js';

export function useBackupActions({ addToast, setOpen }) {
  const [loading, setLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await backupAPI.exportData();
      const payload = res.data;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hackboard-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Yedek dosyasi indirildi', 'success');
    } catch {
      addToast('Yedek alinirken hata olustu', 'error');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      addToast('Sadece JSON dosyalari desteklenir', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        if (!parsed.version || !parsed.data) {
          addToast('Gecersiz yedek dosyasi formati', 'error');
          return;
        }

        const requiredTables = ['users', 'tasks', 'subtasks', 'comments', 'messages', 'activities', 'milestones'];
        for (const table of requiredTables) {
          if (!Array.isArray(parsed.data[table])) {
            addToast('Eksik tablo verisi: ' + table, 'error');
            return;
          }
        }

        setPendingImportData(parsed);
        setImportModalOpen(true);
      } catch {
        addToast('JSON dosyasi okunamadi', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    setImportModalOpen(false);
    setRestoreModalOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!pendingImportData) return;

    try {
      setLoading(true);
      setRestoreModalOpen(false);
      setOpen(false);

      const res = await backupAPI.importData(pendingImportData);
      addToast('Yedek basariyla geri yuklendi (' + res.data.totalRecords + ' kayit)', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      const msg = error.response?.data?.error || 'Geri yukleme sirasinda hata olustu';
      addToast(msg, 'error');
      setLoading(false);
      setPendingImportData(null);
    }
  };

  const handleManualSnapshot = async () => {
    try {
      setLoading(true);
      const res = await backupAPI.exportData();
      const rawData = JSON.stringify(res.data);
      if (rawData.length > 4 * 1024 * 1024) {
        addToast("Snapshot cok buyuk, localStorage sigmayabilir", "warning");
        return;
      }
      localStorage.setItem("hackboard-snapshot:v1", rawData);
      window.dispatchEvent(new CustomEvent("hackboard-snapshot-updated"));
      addToast("Local snapshot alindi", "success");
    } catch {
      addToast("Snapshot alinirken hata olustu", "error");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const resetModals = () => {
    setImportModalOpen(false);
    setRestoreModalOpen(false);
    setPendingImportData(null);
  };

  return {
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
  };
}
