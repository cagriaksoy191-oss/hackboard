import { getDB, prepare, transaction } from './db.js';

function seed() {
  const existing = prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) return;

  const insertUser = prepare('INSERT INTO users (name, role, avatar_color, is_online) VALUES (?, ?, ?, ?)');
  const insertTask = prepare('INSERT INTO tasks (title, description, status, priority, assigned_to, estimated_hours, actual_hours) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertSubtask = prepare('INSERT INTO subtasks (task_id, title, is_completed) VALUES (?, ?, ?)');
  const insertComment = prepare('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)');
  const insertMessage = prepare('INSERT INTO messages (user_id, content) VALUES (?, ?)');
  const insertActivity = prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)');
  const insertMilestone = prepare('INSERT INTO milestones (title, description, target_time, is_completed) VALUES (?, ?, ?, ?)');

  const insertUserMany = transaction((users) => {
    for (const u of users) insertUser.run(u.name, u.role, u.avatar_color, u.is_online);
  });

  insertUserMany([
    { name: 'Çağrı', role: 'Frontend Developer', avatar_color: '#00d4ff', is_online: 1 },
    { name: 'Talha', role: 'Backend Developer', avatar_color: '#7c3aed', is_online: 1 },
    { name: 'Ahmet', role: 'UI/UX Designer', avatar_color: '#10b981', is_online: 0 },
    { name: 'Alaettin', role: 'Project Manager', avatar_color: '#f59e0b', is_online: 1 },
  ]);

  const tasks = [
    { title: 'Auth API endpoints', description: 'Login, register, JWT token endpoints', status: 'done', priority: 'critical', assigned_to: 2, estimated: 4, actual: 3.5 },
    { title: 'Dashboard UI', description: 'Main dashboard layout with stats cards', status: 'done', priority: 'high', assigned_to: 1, estimated: 6, actual: 5 },
    { title: 'Database schema design', description: 'Design and implement all tables', status: 'done', priority: 'high', assigned_to: 2, estimated: 3, actual: 2.5 },
    { title: 'Kanban drag & drop', description: 'Implement drag and drop for Kanban board', status: 'in-progress', priority: 'high', assigned_to: 1, estimated: 5, actual: 2 },
    { title: 'Real-time chat', description: 'Socket.IO based team chat', status: 'in-progress', priority: 'medium', assigned_to: 2, estimated: 4, actual: 1.5 },
    { title: 'Analytics charts', description: 'Recharts integration for analytics', status: 'in-progress', priority: 'medium', assigned_to: 1, estimated: 3, actual: 1 },
    { title: 'User profile page', description: 'Team member profile with stats', status: 'todo', priority: 'low', assigned_to: 1, estimated: 2, actual: 0 },
    { title: 'Notification system', description: 'In-app notifications for updates', status: 'todo', priority: 'medium', assigned_to: 2, estimated: 3, actual: 0 },
    { title: 'API rate limiting', description: 'Implement rate limiting middleware', status: 'todo', priority: 'low', assigned_to: 2, estimated: 2, actual: 0 },
    { title: 'Design system components', description: 'Reusable UI component library', status: 'testing', priority: 'high', assigned_to: 3, estimated: 6, actual: 5.5 },
    { title: 'Responsive layout', description: 'Mobile and tablet responsive design', status: 'testing', priority: 'high', assigned_to: 1, estimated: 4, actual: 3 },
    { title: 'Deployment pipeline', description: 'CI/CD setup and deployment config', status: 'todo', priority: 'medium', assigned_to: 4, estimated: 3, actual: 0 },
  ];

  const insertTaskMany = transaction((ts) => {
    for (const t of ts) {
      const result = insertTask.run(t.title, t.description, t.status, t.priority, t.assigned_to, t.estimated, t.actual);
      const taskId = result.lastInsertRowid;

      if (t.status === 'done' || t.status === 'testing') {
        insertSubtask.run(taskId, 'Initial implementation', 1);
        insertSubtask.run(taskId, 'Code review', t.status === 'done' ? 1 : 0);
        insertSubtask.run(taskId, 'Testing', t.status === 'done' ? 1 : 0);
      } else {
        insertSubtask.run(taskId, 'Research', 1);
        insertSubtask.run(taskId, 'Implementation', 0);
        insertSubtask.run(taskId, 'Testing', 0);
      }
    }
  });

  insertTaskMany(tasks);

  const comments = [
    { task_id: 1, user_id: 1, content: 'Auth endpoints look solid, nice work!' },
    { task_id: 4, user_id: 3, content: 'Can we use dnd-kit for this?' },
    { task_id: 5, user_id: 1, content: 'Socket.IO rooms are set up, ready for testing' },
    { task_id: 10, user_id: 4, content: 'Design review passed, moving to testing' },
  ];

  for (const c of comments) {
    insertComment.run(c.task_id, c.user_id, c.content);
  }

  const messages = [
    { user_id: 1, content: 'Hey team, dashboard is looking great!' },
    { user_id: 2, content: 'Auth API is done, pushing to staging' },
    { user_id: 3, content: 'Design system components are ready for review' },
    { user_id: 4, content: 'Milestone: MVP is on track for tonight' },
    { user_id: 1, content: 'Kanban drag and drop is in progress' },
    { user_id: 2, content: 'Chat is almost ready, just need emoji picker' },
    { user_id: 4, content: 'Remember to commit your code before the checkpoint' },
    { user_id: 3, content: 'Updated the color palette, check Figma' },
  ];

  for (const m of messages) {
    insertMessage.run(m.user_id, m.content);
  }

  const activities = [
    { user_id: 1, action: 'completed', details: 'Dashboard UI task' },
    { user_id: 2, action: 'completed', details: 'Auth API endpoints' },
    { user_id: 2, action: 'completed', details: 'Database schema design' },
    { user_id: 3, action: 'completed', details: 'Design system components' },
    { user_id: 1, action: 'started', details: 'Kanban drag & drop' },
    { user_id: 2, action: 'started', details: 'Real-time chat' },
    { user_id: 1, action: 'started', details: 'Analytics charts' },
    { user_id: 4, action: 'created', details: 'Deployment pipeline task' },
    { user_id: 3, action: 'commented', details: 'on User profile page' },
    { user_id: 1, action: 'completed', details: 'Responsive layout (moved to testing)' },
    { user_id: 2, action: 'updated', details: 'Real-time chat progress' },
    { user_id: 4, action: 'created', details: 'Notification system task' },
    { user_id: 3, action: 'completed', details: 'Color palette update' },
    { user_id: 1, action: 'commented', details: 'on Auth API endpoints' },
    { user_id: 2, action: 'started', details: 'API rate limiting research' },
    { user_id: 4, action: 'updated', details: 'Project timeline' },
    { user_id: 1, action: 'completed', details: 'Sidebar component' },
    { user_id: 3, action: 'completed', details: 'Icon set design' },
    { user_id: 2, action: 'completed', details: 'WebSocket connection handler' },
    { user_id: 4, action: 'commented', details: 'on Deployment pipeline' },
  ];

  for (const a of activities) {
    insertActivity.run(a.user_id, a.action, a.details);
  }

  const now = new Date();
  const milestones = [
    { title: 'Planlama Tamamlandi', description: 'Proje planlamasi ve gorev dagilimi tamamlandi', target_time: new Date(now.getTime() - 2 * 3600000).toISOString(), is_completed: 1 },
    { title: 'API Tamamlandi', description: 'Tum backend API endpointleri hazir', target_time: new Date(now.getTime() + 2 * 3600000).toISOString(), is_completed: 0 },
    { title: 'MVP Hazir', description: 'Temel ozellikler calisir durumda', target_time: new Date(now.getTime() + 6 * 3600000).toISOString(), is_completed: 0 },
    { title: 'Frontend Tamamlandi', description: 'Tum UI componentleri ve sayfalar hazir', target_time: new Date(now.getTime() + 12 * 3600000).toISOString(), is_completed: 0 },
    { title: 'Final Demo', description: 'Sunum ve demo hazirliklari tamamlandi', target_time: new Date(now.getTime() + 20 * 3600000).toISOString(), is_completed: 0 },
  ];

  for (const m of milestones) {
    insertMilestone.run(m.title, m.description, m.target_time, m.is_completed);
  }

  console.log('Database seeded successfully!');
}

export default seed;
