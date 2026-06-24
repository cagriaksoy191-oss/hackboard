import { prepare, execRaw } from './db-adapter.js';

/**
 * seed.js — Multi-Tenant Aware Database Seeder
 *
 * Seeds the database with demo data for local development.
 * All seed records are assigned to the default organization (id=1),
 * default workspace (id=1), and appropriate workflow stages.
 *
 * Idempotent: only runs when the users table is empty.
 */
async function seed() {
  const existing = await prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) return;

  // ── Users ──
  await execRaw(`
    INSERT INTO users (name, role, avatar_color, is_online) VALUES
    ('Çağrı', 'Frontend Developer', '#06b6d4', 1),
    ('Talha', 'Backend Developer', '#8b5cf6', 1),
    ('Ahmet', 'UI/UX Designer', '#10b981', 0),
    ('Alaettin', 'Project Manager', '#f59e0b', 1)
  `);

  // ── Tasks (multi-tenant aware) ──
  // org_id=1 (Default Organization), workspace_id=1 (Default Workspace)
  // workflow_stage_id: 1=todo, 2=in-progress, 3=testing, 4=done
  await execRaw(`
    INSERT INTO tasks (title, description, status, priority, assigned_to, estimated_hours, actual_hours, org_id, workspace_id, workflow_stage_id, embedding_status) VALUES
    ('Auth API endpoints', 'Login, register, JWT token endpoints', 'done', 'critical', 2, 4, 3.5, 1, 1, 4, 'pending'),
    ('Dashboard UI', 'Main dashboard layout with stats cards', 'done', 'high', 1, 6, 5, 1, 1, 4, 'pending'),
    ('Database schema design', 'Design and implement all tables', 'done', 'high', 2, 3, 2.5, 1, 1, 4, 'pending'),
    ('Kanban drag & drop', 'Implement drag and drop for Kanban board', 'in-progress', 'high', 1, 5, 2, 1, 1, 2, 'pending'),
    ('Real-time chat', 'Socket.IO based team chat', 'in-progress', 'medium', 2, 4, 1.5, 1, 1, 2, 'pending'),
    ('Analytics charts', 'Recharts integration for analytics', 'in-progress', 'medium', 1, 3, 1, 1, 1, 2, 'pending'),
    ('User profile page', 'Team member profile with stats', 'todo', 'low', 1, 2, 0, 1, 1, 1, 'pending'),
    ('Notification system', 'In-app notifications for updates', 'todo', 'medium', 2, 3, 0, 1, 1, 1, 'pending'),
    ('API rate limiting', 'Implement rate limiting middleware', 'todo', 'low', 2, 2, 0, 1, 1, 1, 'pending'),
    ('Design system components', 'Reusable UI component library', 'testing', 'high', 3, 6, 5.5, 1, 1, 3, 'pending'),
    ('Responsive layout', 'Mobile and tablet responsive design', 'testing', 'high', 1, 4, 3, 1, 1, 3, 'pending'),
    ('Deployment pipeline', 'CI/CD setup and deployment config', 'todo', 'medium', 4, 3, 0, 1, 1, 1, 'pending')
  `);

  // ── Subtasks ──
  await execRaw(`
    INSERT INTO subtasks (task_id, title, is_completed) VALUES
    (1, 'Initial implementation', 1), (1, 'Code review', 1), (1, 'Testing', 1),
    (2, 'Initial implementation', 1), (2, 'Code review', 1), (2, 'Testing', 1),
    (3, 'Initial implementation', 1), (3, 'Code review', 1), (3, 'Testing', 1),
    (4, 'Research', 1), (4, 'Implementation', 0), (4, 'Testing', 0),
    (5, 'Research', 1), (5, 'Implementation', 0), (5, 'Testing', 0),
    (6, 'Research', 1), (6, 'Implementation', 0), (6, 'Testing', 0),
    (7, 'Research', 1), (7, 'Implementation', 0), (7, 'Testing', 0),
    (8, 'Research', 1), (8, 'Implementation', 0), (8, 'Testing', 0),
    (9, 'Research', 1), (9, 'Implementation', 0), (9, 'Testing', 0),
    (10, 'Initial implementation', 1), (10, 'Code review', 0), (10, 'Testing', 0),
    (11, 'Initial implementation', 1), (11, 'Code review', 0), (11, 'Testing', 0),
    (12, 'Research', 1), (12, 'Implementation', 0), (12, 'Testing', 0)
  `);

  // ── Comments (multi-tenant: org_id derived from task JOIN at query time) ──
  await execRaw(`
    INSERT INTO comments (task_id, user_id, content, embedding_status) VALUES
    (1, 1, 'Auth endpoints look solid, nice work!', 'pending'),
    (4, 3, 'Can we use dnd-kit for this?', 'pending'),
    (5, 1, 'Socket.IO rooms are set up, ready for testing', 'pending'),
    (10, 4, 'Design review passed, moving to testing', 'pending')
  `);

  // ── Messages (multi-tenant aware) ──
  await execRaw(`
    INSERT INTO messages (user_id, content, org_id, workspace_id, channel_id) VALUES
    (1, 'Hey team, dashboard is looking great!', 1, 1, 1),
    (2, 'Auth API is done, pushing to staging', 1, 1, 1),
    (3, 'Design system components are ready for review', 1, 1, 1),
    (4, 'Milestone: MVP is on track for tonight', 1, 1, 1),
    (1, 'Kanban drag and drop is in progress', 1, 1, 1),
    (2, 'Chat is almost ready, just need emoji picker', 1, 1, 1),
    (4, 'Remember to commit your code before the checkpoint', 1, 1, 1),
    (3, 'Updated the color palette, check Figma', 1, 1, 1)
  `);

  // ── Activities (multi-tenant aware + entity linking + metadata) ──
  await execRaw(`
    INSERT INTO activities (user_id, action, details, org_id, workspace_id, entity_type, entity_id, embedding_status) VALUES
    (1, 'completed', 'Dashboard UI task', 1, 1, 'task', 2, 'pending'),
    (2, 'completed', 'Auth API endpoints', 1, 1, 'task', 1, 'pending'),
    (2, 'completed', 'Database schema design', 1, 1, 'task', 3, 'pending'),
    (3, 'completed', 'Design system components', 1, 1, 'task', 10, 'pending'),
    (1, 'started', 'Kanban drag & drop', 1, 1, 'task', 4, 'pending'),
    (2, 'started', 'Real-time chat', 1, 1, 'task', 5, 'pending'),
    (1, 'started', 'Analytics charts', 1, 1, 'task', 6, 'pending'),
    (4, 'created', 'Deployment pipeline task', 1, 1, 'task', 12, 'pending'),
    (3, 'commented', 'on User profile page', 1, 1, 'task', 7, 'pending'),
    (1, 'completed', 'Responsive layout (moved to testing)', 1, 1, 'task', 11, 'pending'),
    (2, 'updated', 'Real-time chat progress', 1, 1, 'task', 5, 'pending'),
    (4, 'created', 'Notification system task', 1, 1, 'task', 8, 'pending'),
    (3, 'completed', 'Color palette update', 1, 1, NULL, NULL, 'pending'),
    (1, 'commented', 'on Auth API endpoints', 1, 1, 'task', 1, 'pending'),
    (2, 'started', 'API rate limiting research', 1, 1, 'task', 9, 'pending'),
    (4, 'updated', 'Project timeline', 1, 1, NULL, NULL, 'pending'),
    (1, 'completed', 'Sidebar component', 1, 1, NULL, NULL, 'pending'),
    (3, 'completed', 'Icon set design', 1, 1, NULL, NULL, 'pending'),
    (2, 'completed', 'WebSocket connection handler', 1, 1, NULL, NULL, 'pending'),
    (4, 'commented', 'on Deployment pipeline', 1, 1, 'task', 12, 'pending')
  `);

  // ── Milestones (multi-tenant aware) ──
  const now = new Date();
  const m1 = new Date(now.getTime() - 2 * 3600000).toISOString();
  const m2 = new Date(now.getTime() + 2 * 3600000).toISOString();
  const m3 = new Date(now.getTime() + 6 * 3600000).toISOString();
  const m4 = new Date(now.getTime() + 12 * 3600000).toISOString();
  const m5 = new Date(now.getTime() + 20 * 3600000).toISOString();

  await execRaw(`
    INSERT INTO milestones (title, description, target_time, is_completed, org_id, workspace_id) VALUES
    ('Planlama Tamamlandi', 'Proje planlamasi ve gorev dagilimi tamamlandi', '${m1}', 1, 1, 1),
    ('API Tamamlandi', 'Tum backend API endpointleri hazir', '${m2}', 0, 1, 1),
    ('MVP Hazir', 'Temel ozellikler calisir durumda', '${m3}', 0, 1, 1),
    ('Frontend Tamamlandi', 'Tum UI componentleri ve sayfalar hazir', '${m4}', 0, 1, 1),
    ('Final Demo', 'Sunum ve demo hazirliklari tamamlandi', '${m5}', 0, 1, 1)
  `);

  // ── Org Memberships ──
  // (backfillMemberships handles this, but explicit seed is more reliable)
  await execRaw(`
    INSERT INTO org_memberships (org_id, user_id, role) VALUES
    (1, 1, 'owner'),
    (1, 2, 'admin'),
    (1, 3, 'member'),
    (1, 4, 'admin')
  `);

  console.log('Database seeded successfully! (multi-tenant aware)');
}

export default seed;
