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
- Layout owns the responsive application shell: desktop keeps the sidebar visible, mobile uses an overlay drawer

**Socket.IO Communication:**
- Single persistent WebSocket connection from each client
- Events handle task CRUD, chat messages, typing indicators, notifications, timer sync, and user status
- Messages are emitted to all connected clients; notifications, typing, and timer events exclude the sender where appropriate
- Server stores `io` instance via `app.set('io', io)` for access in route handlers
- Client listeners should always unregister with the same handler reference (`socket.off(event, handler)`)

**Database:**
- sql.js (SQLite compiled to WebAssembly) runs in-memory
- Database is exported to `hackboard.db` file on every write operation
- Auto-seeded with sample data on first run (users, tasks, subtasks, comments, messages, activities, milestones)
- WARNING: Data is lost on server restart in ephemeral environments (Render.com free tier)

**Theme System:**
- Dark/light mode is driven by CSS custom properties in `client/src/index.css`
- Shared helper utilities such as `input-surface`, `border-theme`, `divider-theme`, and `hover-surface-bg` keep neutral UI surfaces readable across themes
- Header serves as the single host for the theme control

**UI & Layout Architecture:**
- Layout and Header manage the responsive app shell (desktop sidebar, mobile drawer overlay). Header uses flex-shrink instead of overflow hiding to prevent dropdown clipping.
- Modals (Create, Edit, Confirm) are rendered via React Portals to prevent stacking context or transformed-ancestor clipping bugs.
- Chat interface is viewport-bounded (dvh) to keep the composer sticky while isolating scroll to the message list.
- NotificationBell is route-aware: it suppresses 'unread' badges for messages if the user is actively on the /chat route.

## Directory Structure

```
Hackathon/
|-- AGENT.md                          # This file - AI reference document
|-- README.md                         # Project documentation and setup guide
|-- package.json                      # Root package: server deps + scripts
|-- render.yaml                       # Render.com deployment config
|-- .gitignore                        # Git ignore rules
|-- .env.example                      # Environment variable template
|-- server/
|   |-- server.js                     # Express + Socket.IO server entry point
|   |-- db.js                         # sql.js database init, save, prepare wrapper, export/restore helpers
|   |-- seed.js                       # Initial sample data (runs once on empty DB)
|   `-- routes/
|       |-- tasks.js                  # Task CRUD, subtasks, comments APIs
|       |-- users.js                  # User list and online status API
|       |-- messages.js               # Chat message GET/POST API
|       |-- activities.js             # Activity feed API
|       |-- analytics.js              # Dashboard analytics aggregation API
|       |-- milestones.js             # Milestone CRUD API
|       |-- notifications.js          # Notification list API (derived from activities)
|       `-- backup.js                 # Export/import/health backup APIs with atomic restore
`-- client/
    |-- package.json                  # Client package: React deps + build scripts
    |-- vite.config.js                # Vite config with proxy, manualChunks, and build optimization
    |-- tailwind.config.js            # Tailwind theme with custom colors
    |-- index.html                    # HTML entry point
    `-- src/
        |-- main.jsx                  # React entry point
        |-- App.jsx                   # Router + provider wrapper with React.lazy code splitting
        |-- index.css                 # Global styles, CSS variables, and shared theme helper utilities
        |-- lib/
        |   |-- api.js                # Axios API client with /api base URL (includes backupAPI)
        |   `-- socket.js             # Socket.IO client singleton (connects to '/')
        |-- context/
        |   |-- ThemeContext.jsx      # Dark/light theme with localStorage persistence
        |   `-- UserContext.jsx       # Current user state with localStorage persistence + post-restore validation
        |-- hooks/
        |   `-- useBackupSnapshot.js  # Local snapshot management, debounced auto-refresh, recovery evaluation
        |-- components/
        |   |-- Layout.jsx            # Responsive app shell: login gate, desktop sidebar state, header, recovery banner
        |   |-- Sidebar.jsx           # Desktop-persistent / mobile-overlay navigation drawer with route links
        |   |-- Header.jsx            # Top bar: countdown timer, live status, theme toggle, backup menu, notification bell, user avatar, logout (compact on mobile, overflow clipping resolved)
        |   |-- BackupMenu.jsx        # Dropdown: export JSON, import JSON, manual snapshot with confirm modals
        |   |-- RecoveryBanner.jsx    # Conditional banner shown when snapshot/server fingerprint mismatch detected
        |   |-- LoginScreen.jsx       # User selection screen shown when not logged in
        |   |-- KanbanBoard.jsx       # Drag-and-drop Kanban board with search/filter and dynamic user filter
        |   |-- TaskCard.jsx          # Individual task card with portal-backed delete/edit modals and theme-adapted surfaces
        |   |-- TaskTimer.jsx         # Per-task stopwatch with start/stop and budget comparison
        |   |-- CreateTaskModal.jsx   # New task creation form (portal-rendered)
        |   |-- EditTaskModal.jsx     # Task editing form (portal-rendered)
        |   |-- ConfirmModal.jsx      # Generic confirmation dialog (portal-rendered with exit animations)
        |   |-- NotificationBell.jsx  # Real-time notification dropdown with unread badge, click-through routing, and route-aware suppression
        |   |-- ActivityFeed.jsx      # Live activity stream component
        |   |-- StatCard.jsx          # Dashboard stat card component (clickable for kanban scroll navigation)
        |   |-- CountdownTimer.jsx    # Hackathon countdown timer in header
        |   |-- ThemeToggle.jsx       # Sun/moon theme switch button
        |   |-- EmptyState.jsx        # Empty state placeholder with animated icon
        |   |-- Toast.jsx             # Toast notification provider + context + hook
        |   `-- ErrorBoundary.jsx     # React error boundary with refresh button
        `-- pages/
            |-- Dashboard.jsx         # Main dashboard: live stat cards, Kanban board, activity feed
            |-- Tasks.jsx             # Task list with filters, search, create/edit/delete
            |-- TaskDetail.jsx        # Single task view: subtasks, comments, timer
            |-- Team.jsx              # Team member cards with productivity stats
            |-- Timeline.jsx          # Interactive timeline with milestones
            |-- Chat.jsx              # Real-time team chat with sticky composer, independent scroll, and emoji picker
            `-- Analytics.jsx         # Charts (pie, bar, line) + JSON/CSV export
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
| GET | /api/backup/export | Full database export as versioned JSON (all tables + metadata + fingerprint) |
| GET | /api/backup/health | Lightweight health summary: table counts, latest data timestamp, fingerprint, seed heuristic |
| POST | /api/backup/import | Atomic restore from JSON payload with validation, FK checks, and concurrent lock (409) |

## Socket.IO Events

### Server to Client
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
| backup:restored | Broadcast after successful import restore. All clients reload via window.location.reload(). |

### Client to Server
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
2. **Dashboard** - Live stat cards, Kanban board, activity feed
3. **Kanban Board** - Drag and drop between 4 columns (todo, in-progress, testing, done)
4. **Task Management** - Full CRUD with portal-backed modals, subtasks, comments
5. **Task Search and Filter** - By text, priority, user, status with dynamic user lists
6. **Task Timer** - Per-task stopwatch with estimated vs actual comparison
7. **Real-time Chat** - Socket.IO messaging with sticky composer, independent message scroll, emoji picker, and typing indicators
8. **Team Page** - Member cards with productivity stats and task lists
9. **Timeline** - Interactive timeline with milestone tracking
10. **Analytics** - Pie, bar, line charts with JSON/CSV export
11. **Notification System** - Real-time bell with unread badge, filtered by recipient, click-through routing, keyboard-accessible rows, safe mobile placement, and route-aware message suppression
12. **Dark/Light Mode** - Theme toggle with localStorage persistence and shared CSS variable helpers
13. **Error Boundary** - Graceful error handling with refresh option
14. **Toast Notifications** - Success/error/info toasts
15. **Loading Fallbacks** - Spinner with "Yukleniyor..." text for lazy-loaded route chunks
16. **Empty States** - Friendly messages when no data exists
17. **Race Condition Protection** - 409 Conflict on stale task updates
18. **Real-time Sync** - All CRUD operations broadcast via Socket.IO with handler-safe listener cleanup on the client
19. **Fail-safe Persistence and Restore** - Manual JSON export/import, auto local snapshot, recovery banner, multi-client sync
20. **Responsive Navigation Shell** - Desktop sidebar stays visible, mobile uses a collapsible overlay menu. Header actions are compacted, and dropdown clipping is resolved.
21. **Theme-Aware Core Workflows** - Primary forms, dropdowns, task cards, kanban columns, modals, activity surfaces, chat composer, and timeline surfaces are robustly normalized for both dark and premium light mode.
22. **Dynamic Kanban Assignee Filter** - Kanban user filtering reads from `/api/users` instead of hardcoded IDs
23. **Timeline Empty-State Handling** - Loading and empty milestone states are separated to avoid false "loading forever" UX
24. **Dashboard Interactivity** - Stat cards act as scroll-navigation shortcuts to corresponding Kanban columns

## Key Decisions

1. **sql.js over better-sqlite3** - Chosen for simplicity and file-based persistence. Trade-off: no concurrent write safety, data loss on restart in ephemeral environments.
2. **Socket.IO for all real-time** - Single WebSocket connection handles all live updates. REST API used for initial data load and as fallback.
3. **app.set('io', io)** - Express app carries the Socket.IO instance so route handlers can emit events without importing the server module.
4. **Relative URLs for API/Socket** - `baseURL: '/api'` and `io('/')` ensure production compatibility when frontend and backend share the same origin.
5. **localStorage for user/theme** - Simple persistence without auth complexity. Suitable for hackathon context.
6. **Broadcast vs targeted notifications** - Messages use `io.emit` so everyone sees the same chat stream. Notification, typing, and timer events exclude the sender where that UX is appropriate.
7. **409 Conflict for race conditions** - `updated_at` comparison prevents silent overwrites when two users edit the same task simultaneously.
8. **Atomic restore via temp DB** - Import creates a temporary SQL.js database, writes all records, verifies counts, then swaps the global `db` reference. Failed imports leave the live DB untouched.
9. **Fingerprint excludes transient fields** - `users.is_online` is normalized to `0` before fingerprint computation. This prevents presence changes from triggering false-positive recovery banners. Export payload retains real `is_online` values.
10. **Recovery is user-initiated, never automatic** - RecoveryBanner suggests restore but never applies it without explicit user confirmation through a two-step modal flow.
11. **Multi-client sync via reload** - After restore, `backup:restored` socket event triggers `window.location.reload()` on all connected clients, ensuring no stale React state remains.
12. **Responsive shell is breakpoint-owned by Layout** - `Layout.jsx` opens the sidebar on desktop breakpoints and closes it on mobile breakpoints so navigation parity stays predictable.
13. **Theme consistency uses shared utility classes** - Neutral surfaces and inputs rely on shared helpers in `index.css` instead of repeated hardcoded translucent whites.
14. **Socket cleanup always uses handler references** - Client components should remove listeners with `socket.off(event, sameHandler)` to avoid detaching other screens' subscriptions.
15. **Dashboard stats favor correctness over local math** - Stat cards simply refetch tasks on task socket events; for this small hackathon app that is simpler and safer than partial client-side bookkeeping.
16. **Restore initiator has a local reload fallback** - `backup:restored` remains the primary sync mechanism, but the importing client also schedules a local reload in case the socket event is missed.
17. **Single theme toggle in header** - Centralized theme control in the header; removed secondary toggle from sidebar to avoid redundancy.
18. **Responsive flex over overflow-hidden** - Header overflow uses flex-shrink and min-width constraints rather than `overflow-hidden` to prevent horizontal scrolling on mobile without clipping dropdowns.
19. **Route-aware notification implicit read** - NotificationBell automatically marks new message notifications as read (suppressing the badge) if the user is currently on the `/chat` route.
20. **Responsive dropdown positioning** - Mobile notification dropdowns use viewport-relative `fixed` positioning, while desktop retains element-anchored `absolute` positioning to prevent mobile screen overflow.
21. **Portal-rendered modals** - Create, Edit, and Confirm modals use React Portals to break out of complex DOM hierarchies, eliminating stacking context bugs while preserving exit animations.
22. **Viewport-bounded chat layout** - The Chat page sets explicit height bounds (`dvh`), isolating scroll to the message list and keeping the composer sticky.
23. **StatCard to Kanban navigation** - Dashboard stat cards double as quick-scroll anchors to Kanban columns, improving mobile UX.

## Known Limitations

1. **SQLite data loss on restart** - Render.com free tier uses ephemeral filesystem. Database resets on each deploy/restart. Seed data auto-repopulates.
2. **No concurrent write safety** - sql.js has no transaction locking. Simultaneous writes may cause the last writer to win.
3. **No authentication** - User selection is client-side only. No password or token-based auth.
4. **Timer is per-client** - Timer state syncs on start/stop but does not show live countdown to other users.
5. **Notifications from activities table** - Notifications are derived from the activities log, not a dedicated notifications table. Read state is client-side only.
6. **No pagination** - All tasks, messages, and activities are loaded at once.
7. **No file attachments** - Tasks and comments are text-only.
8. **No automated test suite** - Validation currently relies on successful builds plus manual smoke testing instead of automated integration/end-to-end coverage.

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

## Changelog

### 2026-04-08 - Responsive Layout + Theme Consistency + Navigation/Notification UX Fix

**Responsive Shell and Header Ergonomics:**
- Consolidated theme toggle solely in the Header.
- Compacted mobile header actions and resolved desktop/mobile overflow issues via flex-shrink.
- Fixed dropdown clipping for BackupMenu and NotificationBell.
- Reorganized sidebar and logout interactions for clarity.

**Theme and Light Mode Refresh:**
- Strengthened `.light` mode tokens and shared shadow/surface helpers.
- Normalized kanban column surfaces, task cards, modals, inputs, and shell backgrounds for premium light mode consistency.

**Notification UX:**
- Upgraded notification rows with proper button semantics and click-through routing.
- Implemented implicit read and badge suppression for message notifications when actively on the `/chat` route.
- Fixed mobile dropdown positioning via viewport-relative fixed placement while retaining desktop absolute placement.
- Preserved read state and mark-all-read behaviors.

**Modal Stability:**
- Transitioned ConfirmModal, EditTaskModal, and CreateTaskModal to React Portals.
- Fixed transformed-ancestor and tiny modal clipping bugs on Kanban columns.
- Retained AnimatePresence exit animations for portals.

**Dashboard and Task Flow UX:**
- Added Kanban column scroll navigation to Dashboard StatCards.
- Aligned tasks page desktop filter row.

**Chat Usability:**
- Implemented a sticky composer and viewport-bounded chat shell (`dvh`).
- Isolated independent scrolling to the message list.
- Constrained emoji panel height for mobile friendliness.

### 2026-04-08 - Fail-safe Persistence and Restore

**Backend:**
- `server/routes/backup.js` - New route: `GET /api/backup/export`, `GET /api/backup/health`, `POST /api/backup/import` with concurrent restore lock (409)
- `server/db.js` - Added `buildExportPayload()`, `buildFingerprintData()`, `buildExportData()`, `restoreBackupData()`, `getHealthSummary()`, `stableStringify()`, `computeFingerprint()`. Atomic restore via temp DB swap.
- `server/server.js` - Registered backup routes, `express.json({ limit: '10mb' })`

**Frontend:**
- `client/src/hooks/useBackupSnapshot.js` - localStorage snapshot, debounce auto-refresh on socket events, fingerprint-based recovery evaluation
- `client/src/components/BackupMenu.jsx` - Header dropdown: export JSON, import JSON (two-step confirm), manual snapshot
- `client/src/components/RecoveryBanner.jsx` - Conditional mismatch banner with dismiss-by-fingerprint-pair
- `client/src/lib/api.js` - Added `backupAPI` (exportData, getHealth, importData)
- `client/src/components/Layout.jsx` - Mounted `useBackupSnapshot`, `RecoveryBanner`, `backup:restored` socket listener with reload
- `client/src/components/Header.jsx` - Integrated `BackupMenu`
- `client/src/context/UserContext.jsx` - Post-restore user validation (logout if user no longer exists on server)

### 2026-04-08 - Production Build Optimization and Security Hardening

**Bundle Optimization:**
- Route-level code splitting via `React.lazy` + `Suspense` for Team, Timeline, Chat, Analytics, TaskDetail
- `manualChunks` in vite.config.js: vendor (react, react-dom, react-router-dom), charts (recharts), motion (framer-motion), socket (socket.io-client)
- Initial load bundle reduced from 893 kB to ~140 kB (gzip), Analytics chunk loaded on demand only

**Security and Audit:**
- `npm audit` fixed: vite 6.0.5 to 6.4.2 (path traversal, WS file read vulnerabilities)
- lodash override 4.17.21 to 4.18.1 (prototype pollution, code injection via recharts transitive dep)
- Build script: removed redundant `npm install` for deterministic builds

### 2026-04-08 - Manual QA Hardening and UI Stability

**Responsive Shell and Navigation:**
- `client/src/components/Layout.jsx` - Desktop/mobile breakpoint-driven sidebar open state is enforced on resize
- `client/src/components/Sidebar.jsx` - Sidebar now behaves as a desktop-persistent navigation rail and a mobile overlay drawer without losing route access
- `client/src/components/Header.jsx`, `client/src/components/CountdownTimer.jsx`, `client/src/components/StatCard.jsx` - Header/countdown/stat card text tokens aligned with theme-aware text utilities

**Real-time and State Consistency:**
- `client/src/pages/Dashboard.jsx` - Stat cards now resync on `task:created`, `task:updated`, `task:moved`, and `task:deleted`
- `client/src/components/ActivityFeed.jsx`, `client/src/components/NotificationBell.jsx`, `client/src/components/KanbanBoard.jsx`, `client/src/pages/Chat.jsx`, `client/src/pages/TaskDetail.jsx`, `client/src/pages/Tasks.jsx` - Socket listeners now clean up with handler references instead of broad `socket.off(event)` calls
- `client/src/components/BackupMenu.jsx` - Restore flow keeps the socket-based reload and adds a local fallback reload for the importing client
- `client/src/hooks/useBackupSnapshot.js` - Removed unused client-side fingerprint helpers; recovery decisions rely on server-generated fingerprints

**Theme and UX Consistency:**
- `client/src/index.css` - Added shared theme helpers such as `input-surface`, `border-theme`, `divider-theme`, `hover-surface-bg`, `option-surface`, and skeleton helpers
- `client/src/pages/Chat.jsx`, `client/src/pages/Tasks.jsx`, `client/src/pages/TaskDetail.jsx`, `client/src/components/KanbanBoard.jsx`, `client/src/components/NotificationBell.jsx`, `client/src/components/BackupMenu.jsx`, `client/src/pages/Timeline.jsx` - Normalized neutral inputs, dropdowns, bubbles, dividers, empty states, and timeline surfaces for light/dark parity
- `client/src/components/KanbanBoard.jsx` - Replaced hardcoded assignee filter options with live user data from `/api/users`
- `client/src/pages/Timeline.jsx` - Separated loading state from empty milestone state to avoid misleading "still loading" UX

### 2026-04-30 - User Management & Onboarding UX Refinement

**User Deletion Stability:**
- Replaced the browser-native `window.confirm` dialog with a custom React portal-based `ConfirmModal` for user deletion, ensuring 100% reliable execution across all devices and browsers without popup-blocker interference.
- Maintained "soft delete" logic (`is_deleted = 1`) on the backend while updating the frontend UI to immediately reflect deletions.

**Color Picker & Visual Constraints:**
- Enforced a strict 20-color theme palette (`THEME_COLORS`) for all user avatars.
- Added a high-vibrancy red diagonal line (`bg-[#ff0000]`) overlaid on a dark mask to visually cross out colors in the picker that are already claimed by active users.
- Ensured soft-deleted users release their colors back into the available pool.

**Data Migration & Seed Normalization:**
- Added a robust startup migration to `server/db.js` that automatically calculates the Euclidean distance in RGB space to map any legacy/custom user colors to the exact closest match within the new 20-color palette.
- Updated `server/seed.js` and `server/routes/users.js` so that default/randomly assigned users strictly pull from the new 20-color pool, preventing bypasses during ephemeral deployments (e.g. Render).
