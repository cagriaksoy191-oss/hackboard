import { Router } from 'express';
import { buildExportPayload, restoreBackupData, getHealthSummary, prepare } from '../db-adapter.js';

const router = Router();

let restoreLock = false;


const requireAdmin = async (req, res, next) => {
  if (!req.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prepare('SELECT role FROM users WHERE id = ?').get(req.user_id);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/export', requireAdmin, async (req, res) => {
  try {
    const payload = await buildExportPayload();
    res.json(payload);
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ error: 'Failed to export backup data' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const summary = await getHealthSummary();
    res.json(summary);
  } catch (error) {
    console.error('Backup health check error:', error);
    res.status(500).json({ error: 'Failed to get health summary' });
  }
});

router.post('/import', requireAdmin, async (req, res) => {
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
