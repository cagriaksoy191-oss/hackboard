import { Router } from 'express';
import { buildExportPayload, restoreBackupData, getHealthSummary } from '../db.js';

const router = Router();

let restoreLock = false;

router.get('/export', (req, res) => {
  try {
    const payload = buildExportPayload();
    res.json(payload);
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ error: 'Failed to export backup data' });
  }
});

router.get('/health', (req, res) => {
  try {
    const summary = getHealthSummary();
    res.json(summary);
  } catch (error) {
    console.error('Backup health check error:', error);
    res.status(500).json({ error: 'Failed to get health summary' });
  }
});

router.post('/import', async (req, res) => {
  if (restoreLock) {
    return res.status(409).json({ error: 'A restore operation is already in progress' });
  }

  restoreLock = true;

  try {
    const payload = req.body;

    if (!payload || !payload.data) {
      restoreLock = false;
      return res.status(400).json({ error: 'Invalid backup payload: missing data section' });
    }

    const result = await restoreBackupData(payload);

    const io = req.app.get('io');
    if (io) {
      io.emit('backup:restored', {
        restoredAt: result.restoredAt,
        tableCounts: result.tableCounts,
        totalRecords: result.totalRecords,
      });
    }

    res.json({
      success: true,
      message: 'Backup restored successfully',
      restoredAt: result.restoredAt,
      tableCounts: result.tableCounts,
      totalRecords: result.totalRecords,
    });
  } catch (error) {
    console.error('Backup import error:', error);
    res.status(400).json({ error: error.message || 'Failed to restore backup' });
  } finally {
    restoreLock = false;
  }
});

export default router;
