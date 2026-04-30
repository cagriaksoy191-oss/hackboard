import { prepare, transaction, getDB } from './db.js';

function seed() {
  const existing = prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) return;

  const runSeed = transaction(() => {
    const db = getDB();

    db.run(`
      INSERT INTO users (name, role, avatar_color, is_online) VALUES
      ('Çağrı', 'Frontend Developer', '#06b6d4', 1),
      ('Talha', 'Backend Developer', '#8b5cf6', 1),
      ('Ahmet', 'UI/UX Designer', '#10b981', 0),
      ('Alaettin', 'Project Manager', '#f59e0b', 1);
    `);

    db.run(`
      INSERT INTO tasks (title, description, status, priority, assigned_to, estimated_hours, actual_hours) VALUES
      ('Auth API endpoints', 'Login, register, JWT token endpoints', 'done', 'critical', 2, 4, 3.5),
      ('Dashboard UI', 'Main dashboard layout with stats cards', 'done', 'high', 1, 6, 5),
      ('Database schema design', 'Design and implement all tables', 'done', 'high', 2, 3, 2.5),
      ('Kanban drag & drop', 'Implement drag and drop for Kanban board', 'in-progress', 'high', 1, 5, 2),
      ('Real-time chat', 'Socket.IO based team chat', 'in-progress', 'medium', 2, 4, 1.5),
      ('Analytics charts', 'Recharts integration for analytics', 'in-progress', 'medium', 1, 3, 1),
      ('User profile page', 'Team member profile with stats', 'todo', 'low', 1, 2, 0),
      ('Notification system', 'In-app notifications for updates', 'todo', 'medium', 2, 3, 0),
      ('API rate limiting', 'Implement rate limiting middleware', 'todo', 'low', 2, 2, 0),
      ('Design system components', 'Reusable UI component library', 'testing', 'high', 3, 6, 5.5),
      ('Responsive layout', 'Mobile and tablet responsive design', 'testing', 'high', 1, 4, 3),
      ('Deployment pipeline', 'CI/CD setup and deployment config', 'todo', 'medium', 4, 3, 0);
    `);

    db.run(`
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
      (12, 'Research', 1), (12, 'Implementation', 0), (12, 'Testing', 0);
    `);

    db.run(`
      INSERT INTO comments (task_id, user_id, content) VALUES
      (1, 1, 'Auth endpoints look solid, nice work!'),
      (4, 3, 'Can we use dnd-kit for this?'),
      (5, 1, 'Socket.IO rooms are set up, ready for testing'),
      (10, 4, 'Design review passed, moving to testing');
    `);

    db.run(`
      INSERT INTO messages (user_id, content) VALUES
      (1, 'Hey team, dashboard is looking great!'),
      (2, 'Auth API is done, pushing to staging'),
      (3, 'Design system components are ready for review'),
      (4, 'Milestone: MVP is on track for tonight'),
      (1, 'Kanban drag and drop is in progress'),
      (2, 'Chat is almost ready, just need emoji picker'),
      (4, 'Remember to commit your code before the checkpoint'),
      (3, 'Updated the color palette, check Figma');
    `);

    db.run(`
      INSERT INTO activities (user_id, action, details) VALUES
      (1, 'completed', 'Dashboard UI task'),
      (2, 'completed', 'Auth API endpoints'),
      (2, 'completed', 'Database schema design'),
      (3, 'completed', 'Design system components'),
      (1, 'started', 'Kanban drag & drop'),
      (2, 'started', 'Real-time chat'),
      (1, 'started', 'Analytics charts'),
      (4, 'created', 'Deployment pipeline task'),
      (3, 'commented', 'on User profile page'),
      (1, 'completed', 'Responsive layout (moved to testing)'),
      (2, 'updated', 'Real-time chat progress'),
      (4, 'created', 'Notification system task'),
      (3, 'completed', 'Color palette update'),
      (1, 'commented', 'on Auth API endpoints'),
      (2, 'started', 'API rate limiting research'),
      (4, 'updated', 'Project timeline'),
      (1, 'completed', 'Sidebar component'),
      (3, 'completed', 'Icon set design'),
      (2, 'completed', 'WebSocket connection handler'),
      (4, 'commented', 'on Deployment pipeline');
    `);

    const now = new Date();
    db.run(`
      INSERT INTO milestones (title, description, target_time, is_completed) VALUES
      ('Planlama Tamamlandi', 'Proje planlamasi ve gorev dagilimi tamamlandi', '${new Date(now.getTime() - 2 * 3600000).toISOString()}', 1),
      ('API Tamamlandi', 'Tum backend API endpointleri hazir', '${new Date(now.getTime() + 2 * 3600000).toISOString()}', 0),
      ('MVP Hazir', 'Temel ozellikler calisir durumda', '${new Date(now.getTime() + 6 * 3600000).toISOString()}', 0),
      ('Frontend Tamamlandi', 'Tum UI componentleri ve sayfalar hazir', '${new Date(now.getTime() + 12 * 3600000).toISOString()}', 0),
      ('Final Demo', 'Sunum ve demo hazirliklari tamamlandi', '${new Date(now.getTime() + 20 * 3600000).toISOString()}', 0);
    `);
  });

  runSeed();

  console.log('Database seeded successfully!');
}

export default seed;
