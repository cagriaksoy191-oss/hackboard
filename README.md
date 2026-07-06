# HackBoard - Real-time Hackathon Team Management Panel

![HackBoard](https://img.shields.io/badge/version-1.0.0-00d4ff?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socket.io)

## Features

- **Dashboard**: Live interactive stat cards, dynamic Kanban board (drag & drop), live activity feed
- **Task Management & Versioning**: CRUD operations, filtering, subtasks, comments, task timer, and optimistic locking conflict resolver with UI diff-merging screen
- **Team Members**: Online/offline status, productivity charts, role-based access control (RBAC), and per-user task lists
- **Timeline & Milestones**: Interactive timeline, live time indicator, and milestone tracking linked to active sprints
- **Chat & Threads**: Real-time channel messaging, nested threaded replies (Apple-style ThreadPanel), emoji support, and isolated typing indicators
- **RAG Search & Spotlight**: Semantic + fuzzy text hybrid Spotlight search modal (Cmd+K) using Reciprocal Rank Fusion (RRF) and background message vector indexing
- **Analytics & Sprints**: Workspace-scoped sprints, live Burndown and Velocity charts, backlog drag-and-drop allocation, and reports export (JSON/CSV)
- **Notifications**: Real-time notification bell with unread badge and route-aware smart suppression
- **Premium Apple-style UI**: Responsive app shell with dark/light mode toggle, modal focus trapping, Escape-to-close behavior, and swipe gestures
- **Secured Authentication**: JWT-based access/refresh token rotation and session expiration redirects
- **Data Safety & Recovery**: JSON export/import, automated local snapshotting, atomic transactional restore, and client auto-reload
- **Test Automation**: Robust test suites covering APIs, socket isolation, UI focus trapping, gestures, and locking models

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + Framer Motion |
| Backend | Node.js + Express.js (ES Modules) |
| Database | **Dual-Mode Adapter:** PostgreSQL (Supabase/Render) in Production / SQLite (`sql.js`) for Local Fallback |
| Real-time | Socket.IO |
| Charts | Recharts |
| Tests | Node.js Test Runner (server) + JSDOM unit tests (client) |


## Local Setup

```bash
# Install all dependencies
npm run install:all

# Start the application
npm run dev
```

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

Database is auto-created on first run with seed data.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
```

## Deploy to Render.com

1. Push your code to GitHub
2. Go to [Render.com](https://render.com) and create a new Web Service
3. Connect your GitHub repo
4. Use these settings:
   - **Build Command**: `npm install && cd client && npm install && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables:
   - `NODE_ENV` = `production`
   - `ALLOWED_ORIGINS` = `https://your-app-name.onrender.com`
6. Deploy!

> **Note**: Render.com free tier uses ephemeral storage. The SQLite database will be reset on each deploy or restart. For persistent data, consider migrating to PostgreSQL or Turso.

Or use the included `render.yaml`:
```bash
# Connect your repo on Render.com and it will auto-detect render.yaml
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List all tasks |
| POST | /api/tasks | Create new task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| PATCH | /api/tasks/:id/status | Change task status |
| GET | /api/tasks/:id/subtasks | Get subtasks |
| POST | /api/tasks/:id/subtasks | Add subtask |
| GET | /api/tasks/:id/comments | Get comments |
| POST | /api/tasks/:id/comments | Add comment |
| GET | /api/users | List users |
| PATCH | /api/users/:id/status | Update online status |
| GET | /api/messages | Get chat messages |
| POST | /api/messages | Send message |
| GET | /api/activities | Activity feed |
| GET | /api/analytics | Analytics data |
| GET | /api/milestones | List milestones |
| POST | /api/milestones | Create milestone |
| PUT | /api/milestones/:id | Update milestone |
| GET | /api/notifications | Get notifications |

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| task:created | Server -> Client | New task created |
| task:updated | Server -> Client | Task updated |
| task:moved | Server -> Client | Task moved in Kanban |
| task:deleted | Server -> Client | Task deleted |
| message:new | Server -> Client | New chat message |
| notification:new | Server -> Client | New notification |
| user:status | Server -> Client | User status changed |
| activity:new | Server -> Client | New activity |
| subtask:created | Server -> Client | New subtask added |
| subtask:toggled | Server -> Client | Subtask toggled |
| comment:added | Server -> Client | New comment added |
| timer:start | Both | Timer started |
| timer:stop | Both | Timer stopped |
| typing:start | Client -> Server | Started typing |
| typing:stop | Client -> Server | Stopped typing |
| message:send | Client -> Server | Send message |
| task:move | Client -> Server | Move task |
| task:delete | Client -> Server | Delete task |
| task:update | Client -> Server | Update task |
| user:status | Client -> Server | Update user status |

## Design

- **Theme**: Dark mode default, light mode toggle available
- **Background**: #0a0a0f (dark) / #f8fafc (light)
- **Cards**: #1a1a2e (dark) / #ffffff (light)
- **Accent**: #00d4ff (cyan/neon blue)
- **Secondary Accent**: #7c3aed (purple)
- **Glassmorphism**: backdrop-blur + semi-transparent background
- **Animations**: Framer Motion page transitions
- **Transitions**: 300ms smooth theme switching

## Project Structure

```
Hackathon/
├── package.json
├── render.yaml
├── .env.example
├── .gitignore
├── server/
│   ├── server.js          # Express + Socket.IO server
│   ├── db.js              # SQLite database setup
│   ├── seed.js            # Seed data
│   └── routes/
│       ├── tasks.js       # Task APIs
│       ├── users.js       # User APIs
│       ├── messages.js    # Message APIs
│       ├── activities.js  # Activity APIs
│       ├── analytics.js   # Analytics APIs
│       ├── milestones.js  # Milestone APIs
│       └── notifications.js # Notification APIs
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── lib/
        │   ├── api.js     # API client
        │   └── socket.js  # Socket.IO client
        ├── context/
        │   ├── ThemeContext.jsx
        │   └── UserContext.jsx
        ├── components/
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   ├── Header.jsx
        │   ├── CountdownTimer.jsx
        │   ├── StatCard.jsx
        │   ├── TaskCard.jsx
        │   ├── KanbanBoard.jsx
        │   ├── ActivityFeed.jsx
        │   ├── CreateTaskModal.jsx
        │   ├── EditTaskModal.jsx
        │   ├── ConfirmModal.jsx
        │   ├── NotificationBell.jsx
        │   ├── TaskTimer.jsx
        │   ├── ThemeToggle.jsx
        │   ├── EmptyState.jsx
        │   ├── Toast.jsx
        │   ├── LoginScreen.jsx
        │   └── ErrorBoundary.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── Tasks.jsx
            ├── TaskDetail.jsx
            ├── Team.jsx
            ├── Timeline.jsx
            ├── Chat.jsx
            └── Analytics.jsx
```
