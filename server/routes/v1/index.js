/**
 * v1/index.js — API v1 Router Aggregator
 *
 * Registers all v1 routes under /api/v1/ prefix.
 * Auth routes are public (no middleware).
 * All other routes use requireAuth + requireTenant.
 */

import { Router } from 'express';
import authRoutes from './auth.js';

const router = Router();

// ── Public routes (no auth required) ──
router.use('/auth', authRoutes);

// ── Future: Protected routes will be added here ──
// import { requireAuth, requireTenant } from '../../auth/guards.js';
// router.use('/tasks', requireAuth, requireTenant, taskRoutes);
// router.use('/sprints', requireAuth, requireTenant, sprintRoutes);
// ... etc.

export default router;
