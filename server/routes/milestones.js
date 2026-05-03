import { Router } from 'express';
import { prepare } from '../db-adapter.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const milestones = await prepare('SELECT * FROM milestones ORDER BY target_time ASC').all();
    res.json(milestones);
  } catch (err) {
    console.error('Milestones fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, target_time } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }

    if (!target_time || typeof target_time !== 'string' || isNaN(Date.parse(target_time))) {
      return res.status(400).json({ error: 'Valid target_time is required' });
    }

    const result = await prepare(
      'INSERT INTO milestones (title, description, target_time) VALUES (?, ?, ?)'
    ).run(title, description || '', target_time);
    const milestone = await prepare('SELECT * FROM milestones WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(milestone);
  } catch (err) {
    console.error('Milestone create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, target_time, is_completed } = req.body;

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }

    if (target_time !== undefined && (typeof target_time !== 'string' || isNaN(Date.parse(target_time)))) {
      return res.status(400).json({ error: 'target_time must be a valid date string' });
    }

    await prepare(
      'UPDATE milestones SET title = COALESCE(?, title), description = COALESCE(?, description), target_time = COALESCE(?, target_time), is_completed = COALESCE(?, is_completed) WHERE id = ?'
    ).run(
      title !== undefined ? title : null,
      description !== undefined ? description : null,
      target_time !== undefined ? target_time : null,
      is_completed !== undefined ? is_completed : null,
      req.params.id
    );
    const milestone = await prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
    res.json(milestone);
  } catch (err) {
    console.error('Milestone update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
