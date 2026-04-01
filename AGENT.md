# AGENT.md - HackBoard Project Reference

## Project Overview
HackBoard is a real-time collaborative team management panel designed for hackathon teams. It enables 4-person teams working from different locations to manage tasks, communicate via chat, track progress, and coordinate in real-time through a Kanban board, analytics dashboard, and live activity feed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + Framer Motion |
| Routing | React Router DOM v7 |
| Backend | Node.js + Express.js (ES Modules) |
| Database | SQLite via sql.js (in-memory, persisted to file) |
| Real-time | Socket.IO (server) + socket.io-client (client) |
| Charts | Recharts |
| HTTP Client | Axios |
| Build | Vite (client), Node.js (server) |
| Dev Tools | concurrently (parallel dev servers) |

## Architecture

**Client-Server Structure:**
- Express server runs on port 3001 (configurable via `PORT` env var)
- Vite dev server runs on port 5173 with proxy to backend
- In production, Express serves the Vite-built static files from `client/dist/`

**Socket.IO Communication:**
- Single persistent WebSocket connection from each client
- Events handle task CRUD, chat messages, typing indicators, notifications, timer sync, and user status
- Server broadcasts events to all connected clients (except sender for notifications/messages)
- Server stores `io` instance via `app.set('io', io)` for access in route handlers

**Database:**
- sql.js (SQLite compiled to WebAssembly) runs in-memory
- Database is exported to `hackboard.db` file on every write operation
- Auto-seeded with sample data on first run (users, tasks, subtasks, comments, messages, activities, milestones)
- WARNING: Data is lost on server restart in ephemeral environments (Render.com free tier)

## Directory Structure

```
Hackathon/
├── AGENT.md                          # This file - AI reference document
├── README.md                         # Project documentation and setup guide
├── package.json                      # Root package: server deps + scripts
├── render.yaml                       # Render.com deployment config
├── .gitignore                        # Git ignore rules
├── .env.example                      # Environment variable template
├── server/
│   ├── server.js                     # Express + Socket.IO server entry point
│   ├── db.js                         # sql.js database init, save, prepare wrapper
│   ├── seed.js                       # Initial sample data (runs once on empty DB)
│   └── routes/
│       ├── tasks.js                  # Task CRUD, subtasks, comments APIs
│       ├── users.js                  # User list and online status API
│       ├── messages.js               # Chat message GET/POST API
│       ├── activities.js             # Activity feed API
│       ├── analytics.js              # Dashboard analytics aggregation API
│       ├── milestones.js             # Milestone CRUD API
│       └── notifications.js          # Notification list API (derived from activities)
└── client/
    ├── package.json                  # Client package: React deps + build scripts
    ├── vite.config.js                # Vite config with proxy for dev
    ├── tailwind.config.js            # Tailwind theme with custom colors
    ├── index.html                    # HTML entry point
    └── src/
        ├── main.jsx                  # React entry point
        ├── App.jsx                   # Router + provider wrapper (ErrorBoundary > Theme > User > Toast)
        ├── index.css                 # Global styles, CSS variables for dark/light themes
        ├── lib/
        │   ├── api.js                # Axios API client with /api base URL
        │   └── socket.js             # Socket.IO client singleton (connects to '/')
        ├── context/
        │   ├── ThemeContext.jsx      # Dark/light theme with localStorage persistence
        │   └── UserContext.jsx       # Current user state with localStorage persistence
        ├── components/
        │   ├── Layout.jsx            # Main layout: checks login, renders Sidebar + Header + children
        │   ├── Sidebar.jsx           # Navigation sidebar with route links + user info + theme toggle
        │   ├── Header.jsx            # Top bar: countdown timer, live status, notification bell, user avatar, logout
        │   ├── LoginScreen.jsx       # User selection screen shown when not logged in
        │   ├── KanbanBoard.jsx       # Drag-and-drop Kanban board with search/filter
        │   ├── TaskCard.jsx          # Individual task card with delete/edit modals
        │   ├── TaskTimer.jsx         # Per-task stopwatch with start/stop and budget comparison
        │   ├── CreateTaskModal.jsx   # New task creation form
        │   ├── EditTaskModal.jsx     # Task editing form
        │   ├── ConfirmModal.jsx      # Generic confirmation dialog (used for delete)
        │   ├── NotificationBell.jsx  # Real-time notification dropdown with unread badge
        │   ├── ActivityFeed.jsx      # Live activity stream component
        │   ├── StatCard.jsx          # Dashboard stat card component
        │   ├── CountdownTimer.jsx    # Hackathon countdown timer in header
        │   ├── ThemeToggle.jsx       # Sun/moon theme switch button
        │   ├── EmptyState.jsx        # Empty state placeholder with animated icon
        │   ├── Toast.jsx             # Toast notification provider + context + hook
        │   └── ErrorBoundary.jsx     # React error boundary with refresh button
        └── pages/
            ├── Dashboard.jsx         # Main dashboard: stats, Kanban, activity feed
            ├── Tasks.jsx             # Task list with filters, search, create/edit/delete
            ├── TaskDetail.jsx        # Single task view: subtasks, comments, timer
            ├── Team.jsx              # Team member cards with productivity stats
            ├── Timeline.jsx          # Interactive timeline with milestones
            ├── Chat.jsx              # Real-time team chat with emoji picker
            └── Analytics.jsx         # Charts (pie, bar, line) + JSON/CSV export
```

## Database Schema

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | NOT NULL |
| role | TEXT | NOT NULL |
| avatar_color | TEXT | NOT NULL DEFAULT '#7c3aed' |
| is_online | INTEGER | NOT NULL DEFAULT 1 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### tasks
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| title | TEXT | NOT NULL |
| description | TEXT | DEFAULT '' |
| status | TEXT | NOT NULL DEFAULT 'todo' |
| priority | TEXT | NOT NULL DEFAULT 'medium' |
| assigned_to | INTEGER | FK -> users(id) |
| estimated_hours | REAL | DEFAULT 0 |
| actual_hours | REAL | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### subtasks
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| task_id | INTEGER | NOT NULL, FK -> tasks(id) |
| title | TEXT | NOT NULL |
| is_completed | INTEGER | NOT NULL DEFAULT 0 |

### comments
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| task_id | INTEGER | NOT NULL, FK -> tasks(id) |
| user_id | INTEGER | NOT NULL, FK -> users(id) |
| content | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### messages
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FK -> users(id) |
| content | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### activities
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | FK -> users(id) |
| action | TEXT | NOT NULL |
| details | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### milestones
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| title | TEXT | NOT NULL |
| description | TEXT | DEFAULT '' |
| target_time | DATETIME | NOT NULL |
| is_completed | INTEGER | NOT NULL DEFAULT 0 |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | List all tasks (with assigned user info) |
| POST | /api/tasks | Create new task (broadcasts task:created) |
| PUT | /api/tasks/:id | Update task (409 conflict check on updated_at) |
| DELETE | /api/tasks/:id | Delete task with CASCADE (subtasks + comments) |
| PATCH | /api/tasks/:id/status | Change task status (409 conflict check) |
| GET | /api/tasks/:id/subtasks | Get subtasks for a task |
| POST | /api/tasks/:id/subtasks | Add subtask (broadcasts subtask:created) |
| GET | /api/tasks/:id/comments | Get comments for a task |
| POST | /api/tasks/:id/comments | Add comment (broadcasts comment:added) |
| PATCH | /api/subtasks/:id/toggle | Toggle subtask completion (broadcasts subtask:toggled) |
| GET | /api/users | List all users |
| PATCH | /api/users/:id/status | Update user online status |
| GET | /api/messages | List all chat messages |
| POST | /api/messages | Create chat message |
| GET | /api/activities | List activity feed |
| GET | /api/analytics | Get analytics data (progress, status dist, by user, hourly) |
| GET | /api/milestones | List all milestones |
| POST | /api/milestones | Create milestone |
| PUT | /api/milestones/:id | Update milestone |
| GET | /api/notifications | List recent notifications (derived from activities) |
| PATCH | /api/notifications/:id/read | Mark notification as read |

## Socket.IO Events

### Server → Client
| Event | Description |
|-------|-------------|
| task:created | New task was created (includes full task object) |
| task:updated | Task was updated (includes full task object) |
| task:moved | Task was moved to a new status column |
| task:deleted | Task was deleted (includes { id }) |
| message:new | New chat message received |
| notification:new | New notification (filtered: excludes sender) |
| user:status | User online status changed |
| activity:new | New activity log entry |
| subtask:created | New subtask added to a task |
| subtask:toggled | Subtask completion toggled |
| comment:added | New comment added to a task |
| timer:start | Timer started on a task (broadcast) |
| timer:stop | Timer stopped on a task (broadcast) |

### Client → Server
| Event | Description |
|-------|-------------|
| task:move | Move task to new status ({ id, status, user_id }) |
| task:update | Update task fields ({ id, title, description, priority, assigned_to, estimated_hours }) |
| task:delete | Delete task ({ id, user_id }) |
| message:send | Send chat message ({ user_id, content }) |
| typing:start | User started typing ({ user_id }) |
| typing:stop | User stopped typing ({ user_id }) |
| user:status | Update online status ({ user_id, is_online }) |
| timer:start | Start task timer ({ taskId, startTime }) |
| timer:stop | Stop task timer ({ taskId, actualHours }) |

## Features Implemented

1. **User Login Screen** - Select from 4 team members, persisted to localStorage
2. **Dashboard** - Stat cards, Kanban board, activity feed
3. **Kanban Board** - Drag & drop between 4 columns (todo, in-progress, testing, done)
4. **Task Management** - Full CRUD with modals, subtasks, comments
5. **Task Search & Filter** - By text, priority, user, status
6. **Task Timer** - Per-task stopwatch with estimated vs actual comparison
7. **Real-time Chat** - Socket.IO messaging with emoji picker and typing indicators
8. **Team Page** - Member cards with productivity stats and task lists
9. **Timeline** - Interactive timeline with milestone tracking
10. **Analytics** - Pie, bar, line charts with JSON/CSV export
11. **Notification System** - Real-time bell with unread badge, filtered by recipient
12. **Dark/Light Mode** - Theme toggle with localStorage persistence
13. **Error Boundary** - Graceful error handling with refresh option
14. **Toast Notifications** - Success/error/info toasts
15. **Loading Skeletons** - Animated placeholders during data load
16. **Empty States** - Friendly messages when no data exists
17. **Race Condition Protection** - 409 Conflict on stale task updates
18. **Real-time Sync** - All CRUD operations broadcast via Socket.IO

## Key Decisions

1. **sql.js over better-sqlite3** - Chosen for simplicity and file-based persistence. Trade-off: no concurrent write safety, data loss on restart in ephemeral environments.
2. **Socket.IO for all real-time** - Single WebSocket connection handles all live updates. REST API used for initial data load and as fallback.
3. **app.set('io', io)** - Express app carries the Socket.IO instance so route handlers can emit events without importing the server module.
4. **Relative URLs for API/Socket** - `baseURL: '/api'` and `io('/')` ensure production compatibility when frontend and backend share the same origin.
5. **localStorage for user/theme** - Simple persistence without auth complexity. Suitable for hackathon context.
6. **Broadcast vs targeted notifications** - Messages use `socket.broadcast.emit` (excludes sender). Task creation uses `io.emit` (all clients see it).
7. **409 Conflict for race conditions** - `updated_at` comparison prevents silent overwrites when two users edit the same task simultaneously.

## Known Limitations

1. **SQLite data loss on restart** - Render.com free tier uses ephemeral filesystem. Database resets on each deploy/restart. Seed data auto-repopulates.
2. **No concurrent write safety** - sql.js has no transaction locking. Simultaneous writes may cause the last writer to win.
3. **No authentication** - User selection is client-side only. No password or token-based auth.
4. **Timer is per-client** - Timer state syncs on start/stop but does not show live countdown to other users.
5. **Notifications from activities table** - Notifications are derived from the activities log, not a dedicated notifications table. Read state is client-side only.
6. **No pagination** - All tasks, messages, and activities are loaded at once.
7. **No file attachments** - Tasks and comments are text-only.
8. **Hardcoded team members in filter dropdowns** - KanbanBoard filter options list team names statically.

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port number | 3001 | No |
| NODE_ENV | Environment mode | development | No |
| ALLOWED_ORIGINS | Comma-separated list of allowed CORS origins | http://localhost:5173,http://localhost:3001 | No |

## How to Continue Development

1. Read this file first to understand the project structure
2. Check `server/server.js` for the main server setup and Socket.IO events
3. Check `server/routes/tasks.js` for the primary API logic
4. Check `client/src/App.jsx` for the component tree and provider hierarchy
5. Check `client/src/lib/socket.js` and `client/src/lib/api.js` for client-side communication
6. When adding new Socket.IO events, ensure both server handler AND client listener are added with matching names
7. When adding new API endpoints, add the route in `server/routes/` and register in `server/server.js`
8. Always use `user?.id || 1` instead of hardcoded user IDs
9. All toast messages and UI strings should use double quotes if they contain apostrophes or Turkish characters
10. Run `npm run dev` to start both servers in parallel

## Deployment

### Local Development
```bash
npm run install:all   # Install all dependencies
npm run dev           # Start both servers (client on 5173, server on 3001)
```

### Render.com Deployment
1. Push code to GitHub
2. Create new Web Service on Render.com
3. Connect the repo
4. Settings:
   - **Build Command**: `npm install && cd client && npm install && npm run build`
   - **Start Command**: `npm start`
5. Environment Variables:
   - `NODE_ENV` = `production`
   - `ALLOWED_ORIGINS` = `https://your-app-name.onrender.com`
6. Deploy

Alternatively, Render.com auto-detects `render.yaml` for configuration.

### Production Architecture
In production, Express serves the Vite-built static files. Both API and WebSocket share the same origin, so no CORS issues. The SPA fallback routes all non-API requests to `index.html`.
