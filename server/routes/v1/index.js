/**
 * v1/index.js — API v1 Router Aggregator
 *
 * Registers all v1 routes under /api/v1/ prefix.
 * Auth routes are public (no middleware).
 * All other routes use requireAuth + requireTenant.
 */

import { Router } from 'express';
import { requireAuth, requireTenant } from '../../auth/guards.js';
import authRoutes from './auth.js';
import taskRoutes from './tasks.js';
import messageRoutes from './messages.js';
import activityRoutes from './activities.js';
import analyticsRoutes from './analytics.js';
import milestoneRoutes from './milestones.js';
import sprintRoutes from './sprints.js';
import workspaceRoutes from './workspaces.js';
import organizationRoutes from './organizations.js';
import tagRoutes from './tags.js';
import workflowRoutes from './workflows.js';
import channelRoutes from './channels.js';
import searchRoutes from './search.js';

const router = Router();

// ── Public routes (no auth required) ──
router.use('/auth', authRoutes);

// ── Protected routes (require JWT + tenant context) ──
const protectedRouter = Router();
protectedRouter.use(requireAuth);
protectedRouter.use(requireTenant);

protectedRouter.use('/tasks', taskRoutes);
protectedRouter.use('/messages', messageRoutes);
protectedRouter.use('/activities', activityRoutes);
protectedRouter.use('/analytics', analyticsRoutes);
protectedRouter.use('/milestones', milestoneRoutes);
protectedRouter.use('/sprints', sprintRoutes);
protectedRouter.use('/workspaces', workspaceRoutes);
protectedRouter.use('/organizations', organizationRoutes);
protectedRouter.use('/tags', tagRoutes);
protectedRouter.use('/workflows', workflowRoutes);
protectedRouter.use('/channels', channelRoutes);
protectedRouter.use('/search', searchRoutes);

router.use(protectedRouter);

// ── Deprecation notice on legacy routes ──
router.use((req, res, next) => {
  res.set('X-API-Version', 'v1');
  next();
});

export default router;
