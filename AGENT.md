# AGENT.md - HackBoard Project Reference

## Project Overview
HackBoard is a real-time collaborative team management panel designed for hackathon teams. It enables 4-person teams working from different locations to manage tasks, communicate via chat, track progress, and coordinate in real-time through a Kanban board, analytics dashboard, and live activity feed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + Framer Motion |
| Routing | React Router DOM v7 |
| Backend | Node.js + Express.js (ES Modules) |
| Database | **Production:** PostgreSQL (Supabase) via `pg` · **Local fallback:** SQLite via sql.js |
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

**Database (Dual-Mode Adapter):**
- `db-adapter.js` switches mode at startup based on the `DATABASE_URL` env var
- **PostgreSQL mode** (`DATABASE_URL` set): `pg` driver connects to Supabase via connection pool (`max: 10`, `keepAlive: true`, 10s timeout, 3-retry cold-start). All SQL uses `?` placeholders; `db-pg.js` auto-converts to `$1, $2…` via `toPgParams()`. `RETURNING id` is auto-appended to INSERT statements internally. Data is durable and survives restarts.
- **SQLite mode** (`DATABASE_URL` absent): `sql.js` runs in-memory with file export. Synchronous `prepare()` calls are wrapped in async shims for API parity.
- Auto-seeded with sample data on first run (users, tasks, subtasks, comments, messages, activities, milestones)
- `ON DELETE CASCADE` enforced at PG schema level for subtasks and comments; manual deletes kept in route code for SQLite compatibility

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
|   |-- db.js                         # sql.js database init, save, prepare wrapper (SQLite local fallback)
|   |-- db-pg.js                      # PostgreSQL pool, ?→$N conversion, backup/restore/health (production)
|   |-- db-adapter.js                 # Dual-mode switch: DATABASE_URL → PG, else → SQLite
|   |-- seed.js                       # Initial sample data (runs once on empty DB)
|   |-- migrate.js                    # Dual-mode migration runner (reads SQL from migrations/)
|   |-- auth/
|   |   |-- password.js               # scrypt-based password hashing and verification
|   |   |-- tokens.js                 # JWT access/refresh token generation, rotation, revocation
|   |   `-- guards.js                 # requireAuth, requireTenant, requireRole, legacyAuth middleware
|   |-- migrations/
|   |   |-- 001_multi_tenant_tables.sql   # organizations, workspaces, memberships, sprints, channels, etc.
|   |   |-- 002_alter_existing_tables.sql # Multi-tenant + auth + RAG columns on existing tables
|   |   |-- 003_seed_default_org.sql      # Default org, workspace, workflow stages, channel
|   |   `-- 004_backfill_tenant_data.sql  # Assign org_id/workspace_id to existing records
|   `-- routes/
|       |-- tasks.js                  # Task CRUD, subtasks, comments APIs
|       |-- users.js                  # User list and online status API
|       |-- messages.js               # Chat message GET/POST API
|       |-- activities.js             # Activity feed API
|       |-- analytics.js              # Dashboard analytics aggregation API
|       |-- milestones.js             # Milestone CRUD API
|       |-- notifications.js          # Notification list API (derived from activities)
|       |-- backup.js                 # Export/import/health backup APIs with atomic restore
|       `-- v1/
|           |-- index.js              # API v1 route aggregator (requireAuth + requireTenant)
|           |-- auth.js               # v1 auth: register, login, refresh, logout, legacy-login, set-password
|           |-- tasks.js              # Tenant-aware task CRUD with optimistic locking
|           |-- messages.js           # Channel + thread support, room-scoped broadcasts
|           |-- activities.js         # Entity-typed activity feed
|           |-- analytics.js          # Workspace + sprint scoped analytics
|           |-- milestones.js         # Sprint-linked milestones
|           |-- sprints.js            # Workspace-scoped sprint/cycle management
|           |-- workspaces.js         # Org-scoped workspace CRUD
|           |-- organizations.js      # Org management + member roles
|           |-- tags.js               # Org-scoped tag CRUD + task attach/detach
|           `-- workflows.js          # Workspace-scoped workflow stage CRUD + reorder
`-- client/
    |-- package.json                  # Client package: React deps + build scripts
    |-- vite.config.js                # Vite config with proxy, manualChunks, and build optimization
    |-- tailwind.config.js            # Tailwind theme with custom colors
    |-- index.html                    # HTML entry point
    `-- src/
        |-- main.jsx                  # React entry point
        |-- App.jsx                   # Router + provider wrapper with React.lazy code splitting
        |-- design-tokens.css         # ★ Merkezi tasarım token sistemi (renk, tipografi, spacing, shadow, animasyon)
        |-- index.css                 # Global stiller, design-tokens import, backward-compat aliaslar, utility sınıflar
        |-- lib/
        |   |-- api.js                # Axios API client with /api base URL (includes backupAPI)
        |   `-- socket.js             # Socket.IO client singleton (connects to '/')
        |-- context/
        |   |-- ThemeContext.jsx      # Dark/light theme with localStorage persistence
        |   `-- UserContext.jsx       # Current user state with localStorage persistence + post-restore validation
        |-- hooks/
        |   `-- useBackupSnapshot.js  # Local snapshot management, debounced auto-refresh, recovery evaluation
        |-- components/
        |   |-- atoms/                # ★ Atomic Design — En küçük birimler
        |   |   |-- index.js          # Barrel export
        |   |   |-- Button.jsx        # primary, secondary, ghost, danger, accent varyantları + loading
        |   |   |-- Input.jsx         # text/email/password/search/textarea, icon slots, focus ring
        |   |   |-- Badge.jsx         # Status, priority, tag gösterimi + dot indicator
        |   |   |-- Avatar.jsx        # İnitials/image, online status dot, 5 boyut
        |   |   |-- Spinner.jsx       # Accessible loading spinner
        |   |   `-- Tooltip.jsx       # 4 yön, delay, fade-in animasyonu
        |   |-- molecules/            # ★ Atomic Design — Atom kombinasyonları
        |   |   |-- index.js          # Barrel export
        |   |   |-- FormField.jsx     # Label + Input + Error + hint
        |   |   |-- SearchBar.jsx     # Input + search/clear ikonları
        |   |   |-- UserChip.jsx      # Avatar + Name inline
        |   |   |-- StatMetric.jsx    # Değer + etiket + trend göstergesi
        |   |   |-- EmptyState.jsx    # İkon + mesaj + CTA butonu
        |   |   `-- TagChip.jsx       # Renk noktası + tag adı + removable
        |   |-- organisms/            # ★ Atomic Design — Tam işlevsel bileşenler
        |   |   |-- index.js          # Barrel export
        |   |   |-- TaskCard.jsx      # Badge + Avatar + Tooltip atom'ları ile yeniden tasarlanmış görev kartı
        |   |   |-- KanbanColumn.jsx  # Kolon başlığı, renk dot, görev sayısı, drop zone
        |   |   |-- ActivityItem.jsx  # Eylem ikonu + kullanıcı + detay + zaman
        |   |   |-- SprintCard.jsx    # Sprint özeti: durum badge, tarih, ilerleme çubuğu
        |   |   |-- ChatMessage.jsx   # Apple Messages esintili mesaj baloncuğu + thread
        |   |   |-- NotificationItem.jsx # Tip ikonu + okunmadı dot + zaman
        |   |   `-- MilestoneNode.jsx # Tamamlanma/gecikme durumu, bayrak/onay ikonu
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
        |   |-- CountdownTimer.jsx    # Hackathon countdown timer in header (deprecated — Phase 3'te kaldırılacak)
        |   |-- ThemeToggle.jsx       # Sun/moon theme switch button
        |   |-- EmptyState.jsx        # Empty state placeholder with animated icon (legacy — molecules/EmptyState.jsx ile değiştirilecek)
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

> **Note:** PG uses `SERIAL PRIMARY KEY` and `TIMESTAMPTZ DEFAULT NOW()`. SQLite uses `INTEGER PRIMARY KEY AUTOINCREMENT` and `DATETIME DEFAULT CURRENT_TIMESTAMP`. The adapter handles this transparently.

### users
| Column | Type (PG / SQLite) | Constraints |
|--------|------|-------------|
| id | SERIAL / INTEGER | PRIMARY KEY |
| name | TEXT | NOT NULL |
| role | TEXT | NOT NULL |
| avatar_color | TEXT | NOT NULL DEFAULT '#7c3aed' |
| is_online | INTEGER | NOT NULL DEFAULT 1 |
| is_deleted | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMPTZ / DATETIME | DEFAULT NOW() |

### tasks
| Column | Type (PG / SQLite) | Constraints |
|--------|------|-------------|
| id | SERIAL / INTEGER | PRIMARY KEY |
| title | TEXT | NOT NULL |
| description | TEXT | DEFAULT '' |
| status | TEXT | NOT NULL DEFAULT 'todo' · CHECK (todo, in-progress, testing, done) |
| priority | TEXT | NOT NULL DEFAULT 'medium' · CHECK (low, medium, high, critical) |
| assigned_to | INTEGER | FK -> users(id) |
| estimated_hours | REAL | DEFAULT 0 |
| actual_hours | REAL | DEFAULT 0 |
| created_at | TIMESTAMPTZ / DATETIME | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ / DATETIME | DEFAULT NOW() |

### subtasks
| Column | Type (PG / SQLite) | Constraints |
|--------|------|-------------|
| id | SERIAL / INTEGER | PRIMARY KEY |
| task_id | INTEGER | NOT NULL, FK -> tasks(id) ON DELETE CASCADE |
| title | TEXT | NOT NULL |
| is_completed | INTEGER | NOT NULL DEFAULT 0 |

### comments
| Column | Type (PG / SQLite) | Constraints |
|--------|------|-------------|
| id | SERIAL / INTEGER | PRIMARY KEY |
| task_id | INTEGER | NOT NULL, FK -> tasks(id) ON DELETE CASCADE |
| user_id | INTEGER | NOT NULL, FK -> users(id) |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ / DATETIME | DEFAULT NOW() |

### messages
| Column | Type (PG / SQLite) | Constraints |
|--------|------|-------------|
| id | SERIAL / INTEGER | PRIMARY KEY |
| user_id | INTEGER | NOT NULL, FK -> users(id) |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ / DATETIME | DEFAULT NOW() |

### activities
| Column | Type (PG / SQLite) | Constraints |
|--------|------|-------------|
| id | SERIAL / INTEGER | PRIMARY KEY |
| user_id | INTEGER | FK -> users(id) |
| action | TEXT | NOT NULL |
| details | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ / DATETIME | DEFAULT NOW() |

### milestones
| Column | Type (PG / SQLite) | Constraints |
|--------|------|-------------|
| id | SERIAL / INTEGER | PRIMARY KEY |
| title | TEXT | NOT NULL |
| description | TEXT | DEFAULT '' |
| target_time | TIMESTAMPTZ / DATETIME | NOT NULL |
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

1. **Dual-mode adapter (pg + sql.js)** - Production uses Supabase PostgreSQL via `pg` driver for durable persistence. Local development falls back to sql.js when `DATABASE_URL` is absent. The adapter wraps synchronous SQLite calls in async shims so all route code uses the same `await prepare(…)` API regardless of mode.
2. **Socket.IO for all real-time** - Single WebSocket connection handles all live updates. REST API used for initial data load and as fallback.
3. **app.set('io', io)** - Express app carries the Socket.IO instance so route handlers can emit events without importing the server module.
4. **Relative URLs for API/Socket** - `baseURL: '/api'` and `io('/')` ensure production compatibility when frontend and backend share the same origin.
5. **localStorage for user/theme** - Simple persistence without auth complexity. Suitable for hackathon context.
6. **Broadcast vs targeted notifications** - Messages use `io.emit` so everyone sees the same chat stream. Notification, typing, and timer events exclude the sender where that UX is appropriate.
7. **409 Conflict for race conditions** - `updated_at` comparison prevents silent overwrites when two users edit the same task simultaneously.
8. **Atomic restore via transaction** - In PG mode, import uses a dedicated client with `BEGIN/COMMIT/ROLLBACK`. In SQLite mode, import uses a temp DB swap. Both verify record counts before committing.
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

1. ~~**SQLite data loss on restart**~~ — **RESOLVED** (2026-05-03). Production now uses Supabase PostgreSQL. Data persists across Render.com restarts, deploys, and sleep cycles.
2. ~~**No concurrent write safety**~~ — **RESOLVED** (2026-05-03). PostgreSQL provides full ACID transaction support. `ON DELETE CASCADE` and `CHECK` constraints enforce data integrity at the database level.
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
| DATABASE_URL | PostgreSQL connection string (Supabase Transaction Pooler, port 6543). When set → PG mode. When absent → SQLite fallback. | — | **Yes (production)** |

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
# No DATABASE_URL needed — automatically uses SQLite fallback
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
   - `DATABASE_URL` = `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
6. Deploy

Alternatively, Render.com auto-detects `render.yaml` for configuration.

### Production Architecture
In production, Express serves the Vite-built static files. Both API and WebSocket share the same origin, so no CORS issues. The SPA fallback routes all non-API requests to `index.html`.

### Database Architecture (Dual-Mode)
- **Production (Render.com):** `DATABASE_URL` → `db-pg.js` → Supabase PostgreSQL (managed, durable, connection-pooled)
- **Local Development:** No `DATABASE_URL` → `db-adapter.js` → `db.js` → sql.js SQLite (zero-config)
- **Rollback:** Remove `DATABASE_URL` from Render env vars → instant SQLite fallback, zero code changes
- **Cold Start Protection:** 3-retry with exponential backoff (2s, 4s), `keepAlive: true`, 10s connection timeout
- **Supabase Project:** `udzokyspkshuktsifthj` · Region: `eu-central-1` · 7 tables with FK + CASCADE + CHECK constraints

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

### 2026-05-03 - PostgreSQL Migration (sql.js → Supabase)

**Motivasyon:** Render.com ephemeral disk yapısı nedeniyle sunucu her restart'ta tüm veriyi kaybediyordu. Kalıcı veritabanı göçü ile bu sorun kökten çözüldü.

**Yeni Dosyalar:**
- `server/db-pg.js` — PostgreSQL connection pool (`pg` driver), `?`→`$N` otomatik placeholder dönüşümü (`toPgParams`), async `prepare().run/get/all` API'si, `RETURNING id` auto-append, backup export/import/health (dedicated client transaction ile), cold start retry (3×backoff), `keepAlive`, 10s timeout
- `server/db-adapter.js` — Dual-mode switch: `DATABASE_URL` varsa PG, yoksa SQLite. SQLite'ın senkron `prepare()` çağrılarını async wrapper'a sararak her iki modda aynı `await prepare(…)` API'sini sunar.

**Güncellenen Dosyalar (11):**
- `package.json` — `pg@^8.20.0` bağımlılığı eklendi
- `.env.example` — `DATABASE_URL` dokümentasyonu eklendi
- `server/server.js` — Tüm import'lar `db-adapter.js`'den, socket handler'lar async/await, graceful shutdown PG (`pool.end()`) / SQLite (`flushSave()`) ayrımı, `DB_MODE` startup log'da
- `server/seed.js` — `db-adapter.js`'den import, `execRaw()` ile multi-row INSERT, async
- `server/routes/tasks.js` — async/await + try/catch + adapter import, CASCADE manual delete korundu
- `server/routes/users.js` — async/await + try/catch + adapter import
- `server/routes/messages.js` — async/await + try/catch + adapter import
- `server/routes/activities.js` — async/await + try/catch + adapter import
- `server/routes/analytics.js` — async/await + `DB_MODE` conditional (`strftime` vs `EXTRACT(HOUR)`)
- `server/routes/milestones.js` — async/await + try/catch + adapter import
- `server/routes/notifications.js` — async/await + try/catch + adapter import
- `server/routes/backup.js` — async/await + adapter import

**Supabase Altyapısı:**
- Proje: `udzokyspkshuktsifthj` (eu-central-1, free tier)
- 7 tablo: users, tasks, subtasks, comments, messages, activities, milestones
- `ON DELETE CASCADE` (subtasks, comments), `CHECK` constraints (status, priority)
- Sequence reset (`setval`) backup restore sonrası

**Doğrulama:**
- Yerel SQLite fallback testi: `[db-adapter] Mode: SQLite (local fallback)` ✅
- Render.com PG testi: `[db-adapter] Mode: PostgreSQL (Supabase)` ✅
- Canlı veri kalıcılığı: Restart sonrası veri kaybolmuyor ✅
- Frontend: Sıfır değişiklik, API kontratı korundu ✅

### 2026-05-20 - Phase 1: Multi-Tenancy Foundation & Auth Architecture

**Motivasyon:** HackBoard'u hackathon-seviyesinden kurumsal platforma dönüştürmek için temel altyapı: çok kiracılı (multi-tenant) veri izolasyonu, gerçek kimlik doğrulama (e-posta/şifre), rol bazlı erişim kontrolü (RBAC) ve SQL migration altyapısı.

**Yeni Dizinler ve Dosyalar:**
- `server/auth/password.js` — Node.js `crypto.scrypt` tabanlı şifre hash/doğrulama (bcrypt native addon sorunlarını önler)
- `server/auth/tokens.js` — JWT access token (15dk) + refresh token (7gün, DB'de hashli, rotation destekli) yönetimi
- `server/auth/guards.js` — 4 middleware: `requireAuth` (JWT doğrulama), `requireTenant` (org context çözümleme + üyelik kontrolü), `requireRole` (RBAC), `legacyAuth` (geriye dönük uyum)
- `server/migrate.js` — Dual-mode migration runner: `server/migrations/*.sql` dosyalarını sırayla okur, statement bazlı çalıştırır, `_migrations` tablosunda takip eder, ALTER TABLE duplicate column hatalarını idempotent şekilde atlar. Ayrıca PostgreSQL modunda çalışırken SQLite DDL sözdizimini (AUTOINCREMENT -> SERIAL, DATETIME -> TIMESTAMPTZ vb.) dinamik olarak PostgreSQL lehçesine dönüştürür.
- `server/migrations/001_multi_tenant_tables.sql` — organizations, workspaces, org_memberships, tags, task_tags, sprints, workflow_stages, channels, refresh_tokens tabloları
- `server/migrations/002_alter_existing_tables.sql` — Mevcut tablolara org_id, workspace_id, email, password_hash, sprint_id, workflow_stage_id, content_type, embedding_status, version kolonları
- `server/migrations/003_seed_default_org.sql` — Varsayılan organizasyon, workspace, workflow stages (mevcut 4 Kanban kolonu), default chat kanalı
- `server/migrations/004_backfill_tenant_data.sql` — Mevcut verilere org_id=1, workspace_id=1 atanması, task status → workflow_stage_id eşlenmesi
- `server/routes/v1/index.js` — API v1 route toplayıcısı
- `server/routes/v1/auth.js` — `POST register/login/refresh/logout/legacy-login/set-password` endpoint'leri

**Güncellenen Dosyalar:**
- `server/server.js` — Inline JWT_SECRET ve requireAuth middleware kaldırıldı → `auth/guards.js`'den `legacyAuth` import edildi. Migration runner (`runMigrations`) ve membership backfill (`backfillMemberships`) DB init sonrası çağrılıyor. Socket.IO auth `verifyAccessToken` kullanıyor. Socket bağlantısında `socket.join(`tenant:${orgId}`)` ile room-based izolasyon eklendi. v1 route'ları `/api/v1` prefix'ine mount edildi.
- `server/routes/users.js` — `jwt` import kaldırıldı → `auth/tokens.js`'den `generateAccessToken` import edildi. Login ve user create'te token üretimi `generateAccessToken` ile yapılıyor. Yeni kullanıcılar otomatik olarak default org'a üye yapılıyor.

**Mimari Kararlar:**
- Multi-tenancy: Shared database + `tenant_id` kolon izolasyonu (ADR-001)
- Auth: E-posta/şifre + JWT access/refresh token çifti (ADR-002)
- Şifre hash: `crypto.scrypt` (platform-bağımsız, native addon gereksiz)
- Migration: Idempotent SQL (duplicate column/table hataları atlanır)
- Geriye dönük uyum: Eski `/api` route'ları `legacyAuth` ile korunuyor; yeni `/api/v1` route'ları `requireAuth + requireTenant` kullanıyor
- Room-based Socket.IO: Her bağlantıda `tenant:{orgId}` odasına otomatik katılım

### 2026-05-21 - Phase 2: Backend REST & WebSocket Modülerizasyonu

**Motivasyon:** Phase 1'de kurulan multi-tenant altyapıyı tüm API katmanına yaymak. Global broadcast'ten room-based izolasyona geçiş. API versiyonlama ile geriye dönük uyumluluk garantisi.

**Yeni Dosyalar (10 route):**
- `server/routes/v1/tasks.js` — Tenant-aware CRUD, optimistic locking (version kolonu), workspace/sprint filtreleme, room-scoped broadcast
- `server/routes/v1/messages.js` — Channel + thread desteği, pagination (before_id), room seçimi: channel > workspace > tenant
- `server/routes/v1/activities.js` — entity_type + entity_id filtreleme ile granüler aktivite akışı
- `server/routes/v1/analytics.js` — Workspace + sprint bazlı analitik, workflow stage dağılımı, sprint burndown
- `server/routes/v1/milestones.js` — Sprint-linked milestone CRUD, tenant izolasyonu
- `server/routes/v1/sprints.js` — Workspace-scoped sprint yönetimi (planning/active/completed/cancelled)
- `server/routes/v1/workspaces.js` — Org-scoped workspace CRUD, auto-create workflow stages + default channel
- `server/routes/v1/organizations.js` — Org detay, ayarlar, üye listesi, rol değişikliği (owner-only), üye çıkarma (admin+)
- `server/routes/v1/tags.js` — Org-scoped etiket CRUD + task-tag attach/detach
- `server/routes/v1/workflows.js` — Workspace-scoped workflow stage CRUD + position reorder + silme koruması

**Güncellenen Dosyalar:**
- `server/routes/v1/index.js` — Tüm v1 route'ları `requireAuth + requireTenant` middleware zinciriyle bağlandı
- `server/server.js` — Socket.IO handler'lar: `io.emit()` → `io.to(room).emit()` dönüşümü. `workspace:join`/`workspace:leave` event'leri eklendi. Activity INSERT'lerine `org_id, workspace_id, entity_type, entity_id` eklendi. `version = version + 1` optimistic locking tüm task update'lerine eklendi. Legacy route'lara `X-API-Deprecated`, `X-API-Migration`, `Sunset` header'ları eklendi (90 gün).

**Mimari Kararlar:**
- Room hiyerarşisi: `channel:{id}` > `workspace:{id}` > `tenant:{orgId}` (en dar scope tercih edilir)
- Optimistic locking: `WHERE id = ? AND version = ?` + `version = version + 1` (409 Conflict dönüşü ile)
- Geriye dönük uyum: Legacy route'lar çalışmaya devam ediyor, `X-API-Deprecated: true` header'ı ile deprecation sinyali
- Socket.IO fallback: `socket.org_id` null ise (legacy client) global broadcast'e geri düşer

### 2026-05-21 - Phase 2 Hotfix: Sunucu Taraflı Otomatik Oda Aboneliği

**Sorun:** Phase 2'de `task:move`/`task:updated` gibi event'ler `workspace:${workspace_id}` odalarına daraltıldı. Ancak istemci (legacy frontend) henüz `workspace:join` event'i tetiklemediği için Kanban sürüklemeleri anlık olarak ekrana yansımıyordu (ancak sayfa yenilenince veriler doğru geliyordu).

**Çözüm (`server/server.js` — Socket.IO `io.use` middleware):**
- JWT doğrulaması ve `orgId` çözümlemesinden hemen sonra, sunucu o organizasyona ait **tüm workspace** ve **channel**'ları DB'den sorgular.
- Bağlanan soket sunucu tarafında otomatik olarak `workspace:${ws.id}` ve `channel:${ch.id}` odalarına dahil edilir.
- İstemcide manuel `workspace:join` event'i yönetimi gereksizleşti; gerçek zamanlı senkronizasyon (Kanban, Chat) kesintisiz çalışıyor.

**Phase 3 İçin Direktif:**
- İstemci zaten sunucu tarafından tüm workspace/channel odalarına otomatik olarak konumlandırılmaktadır.
- Phase 3 tasarım entegrasyonlarında ayrıca `socket.emit('workspace:join')` çağrısı yapılmasına **gerek yoktur**.
- Socket.IO event listener'ları (`task:moved`, `task:updated`, `message:new` vb.) doğrudan UI güncellemelerini tetikleyebilir.

### 2026-05-26 - Phase 3.1: Tasarım Token Sistemi ve Atomic Design Temeli

**Motivasyon:** Hackathon tarzı neon efektler, agresif renkler ve tutarsız değerleri profesyonel, Apple-esintili minimal bir tasarım diline dönüştürmek. Atomic Design ile yeniden kullanılabilir bileşen katmanı kurmak.

**Yeni Dosyalar:**
- `client/src/design-tokens.css` — Merkezi tasarım token'ları: tipografi (Inter, 10 boyut), spacing (4px tabanlı 20 adım), radius (8 adım), Apple-style çok katmanlı gölge (7 seviye + renkli accent shadow'lar), animasyon (7 duration + 7 easing dahil ease-apple/ease-spring), Slate nötr palet (12 ton), accent renkler (5 renk × hover/muted varyantları), priority/status renkler, z-index ölçeği, dark/light semantic token'lar
- `client/src/components/atoms/Button.jsx` — 5 varyant × 5 boyut + loading/icon/fullWidth
- `client/src/components/atoms/Input.jsx` — forwardRef, label/error/hint, icon slots, multiline, focus ring
- `client/src/components/atoms/Badge.jsx` — 13 preset (priority + status + semantic), dot indicator, removable, custom color
- `client/src/components/atoms/Avatar.jsx` — İnitials/image, 5 boyut, online/offline status dot
- `client/src/components/atoms/Spinner.jsx` — Accessible, 5 boyut, sr-only label
- `client/src/components/atoms/Tooltip.jsx` — 4 yön, configurable delay, keyboard accessible, fade-in
- `client/src/components/molecules/FormField.jsx` — Label + Input + required indicator + children slot
- `client/src/components/molecules/SearchBar.jsx` — Search/clear ikon, clearable state
- `client/src/components/molecules/UserChip.jsx` — Avatar + name/subtitle, interactive mode
- `client/src/components/molecules/StatMetric.jsx` — Büyük değer + etiket + trend göstergesi
- `client/src/components/molecules/EmptyState.jsx` — İkon container + title + description + CTA, compact mode
- `client/src/components/molecules/TagChip.jsx` — Renk dot + tag adı + removable

**Güncellenen Dosyalar:**
- `client/src/index.css` — Tamamen yeniden yapılandırıldı: design-tokens.css import, pulse-glow/neon efektler kaldırıldı, card-hover `scale(1.02)` → `translateY(-1px)` + shadow, dragging `rotate(3deg)` → `rotate(1deg)`, Apple-style focus ring, fade-in/slide-up animasyonlar eklendi, Firefox scrollbar desteği, backward-compat legacy token alias'ları korundu
- `client/index.html` — Title: "HackBoard — Enterprise Workflow Platform", meta description eklendi

**Kaldırılan Hackathon Öğeleri:**
- `pulse-glow` animasyonu (neon `#00d4ff` glow)
- `#00d4ff` cyan rengi → `accent-primary` (indigo) ile değiştirildi
- `rgba(26, 26, 46, *)` mor tonlu yüzeyler → `slate-800/900` bazlı nötr tonlar
- `scale(1.02)` agresif hover → `translateY(-1px)` zarif Apple-style hover

**Mimari Kararlar:**
- Token-first: Hiçbir bileşen raw renk/boyut değeri kullanmamalı, her zaman `var(--token)` referansı
- Backward-compat: Eski `--bg-color`, `--card-bg` vb. token'lar yeni semantic token'lara alias olarak korundu
- Atomic Design: atoms → molecules → organisms → templates hiyerarşisi
- Barrel export: Her katman `index.js` ile clean import sağlar

### 2026-05-26 - Phase 3.2: Organisms — Tam İşlevsel Bileşenler

**Yeni Dosyalar (7 organism):**
- `client/src/components/organisms/TaskCard.jsx` — Badge + Avatar + Tooltip atom'ları ile Apple-style görev kartı; tag gösterimi, subtask progress, priority dot, saat göstergesi, backward-compat drag/delete/edit API
- `client/src/components/organisms/KanbanColumn.jsx` — Renk dot başlık, görev sayısı badge, drag-over accent highlight + shadow, scrollable kart alanı
- `client/src/components/organisms/ActivityItem.jsx` — 6 eylem tipi × özel SVG ikon + renk-kodlu ikon arka planı, göreli zaman, compact mode
- `client/src/components/organisms/SprintCard.jsx` — Sprint durumu badge (planning/active/completed/cancelled), tarih aralığı, ilerleme çubuğu, aktif sprint accent vurgusu
- `client/src/components/organisms/ChatMessage.jsx` — Apple Messages esintili mesaj baloncuğu: kendi mesajları accent renk, karşı mesajlar surface renk, thread yanıt butonu (hover-reveal)
- `client/src/components/organisms/NotificationItem.jsx` — 4 tip (message/task/mention/system) × özel ikon + renk, okunmadı dot + accent arka plan
- `client/src/components/organisms/MilestoneNode.jsx` — Tamamlanma/gecikme durumu renk kodlaması, onay/bayrak ikonu, tarih göstergesi

### 2026-05-26 - Phase 3.3: Ana Bileşen Entegrasyonu — Apple Tasarım Dili Uygulaması

**Motivasyon:** Phase 3.1-3.2'de oluşturulan Atomic Design bileşenlerini (atoms/molecules/organisms) ana sayfa ve layout bileşenlerine entegre ederek uygulamayı Apple-esintili yeni tasarım sistemiyle canlandırmak.

**Yeniden Yazılan Dosyalar:**
- `client/src/components/Sidebar.jsx` — Hackathon gradient logo → temiz indigo logo + "Enterprise Platform" alt başlığı, section header ("Navigasyon"), SVG inline path'ler → tam JSX SVG ikonlar, `glass-strong` → solid `bg-surface` arka plan, Avatar atom + online status, Tooltip atom logout butonu, aktif sayfa indigo dot göstergesi
- `client/src/components/Header.jsx` — **CountdownTimer kaldırıldı** (hackathon artefact), frosted glass `backdrop-blur-xl` efekti, Avatar atom kullanıcı gösterimi, Tooltip logout, `animate-ping` canlı göstergesi, `glass` → solid surface/blur
- `client/src/components/KanbanBoard.jsx` — `TaskCard` → `organisms/TaskCard`, yeni `KanbanColumn` organism ile kolon render, `SearchBar` molecule, `Button` atom, `EmptyState` molecule; neon glow highlight (`#00d4ff`) kaldırıldı, gradient kolon arka planları → clean surface token'lar
- `client/src/pages/Dashboard.jsx` — Eski `StatCard` import kaldırıldı, inline `DashboardStatCard` ile Apple-style stat kartları (motion spring değer animasyonu, hover icon scale, design-token ikonlar); hackathon renk sınıfları (`bg-accent/20` vb.) → token-based
- `client/src/components/ActivityFeed.jsx` — `ActivityItem` organism kullanımı, `EmptyState` molecule, inline SVG path'ler → organism'a taşındı, `glass` → clean surface container, ping göstergeli header

**Kaldırılan Hackathon Öğeleri:**
- `CountdownTimer` import ve render (Header'dan tamamen kaldırıldı)
- `StatCard` bileşeni import (Dashboard artık inline DashboardStatCard kullanıyor)
- Neon glow column highlight (`shadow-[0_0_30px_rgba(0,212,255,0.3)]`)
- Gradient column arka planları (`bg-gradient-to-b from-blue-500/20 to-blue-600/10` vb.)
- `getInitials` import (Avatar atom kendi hesaplar)

**Korunan İş Mantığı:**
- Socket.IO event listener'ları (`task:moved`, `task:created`, `task:deleted`, `task:updated`, `activity:new`) — %100 korundu
- Drag & drop Kanban mantığı — `handleDragStart`, `handleDrop`, `handleDragOver` — %100 korundu
- Optimistic update pattern — `setTasks(prev => ...)` — %100 korundu
- Filter/search memoization — `useMemo(() => filterTasks(...))` — %100 korundu
- `scrollToKanban` dashboard navigasyonu — %100 korundu

### 2026-05-27 - Phase 3.4: Kalan Sayfa Entegrasyonu — Tam Apple Arayüzü

**Yeniden Yazılan Dosyalar (4 sayfa + 2 alt bileşen):**
- `client/src/pages/Chat.jsx` — `glass` → solid surface+border, online kullanıcı sayısı göstergesi, consistent 15px heading, ping indicator
- `client/src/components/chat/ChatMessage.jsx` — Avatar atom kullanımı, gradient bubble → solid `accent-primary`, design-token renk sistemi
- `client/src/components/chat/ChatInput.jsx` — Gradient send butonu → solid accent+shadow, frosted glass backdrop, aktif emoji state indicator, design-token input
- `client/src/pages/Team.jsx` — Avatar atom + online status, Badge atom görev priority, `text-white`/`text-gray-400` → design-token, `bg-white/5` → `interactive-muted`, AnimatePresence görev detay paneli, seçili kullanıcı accent vurgusu
- `client/src/pages/Analytics.jsx` — Spinner atom loading, Button atom export, `#1a1a2e` tooltip → design-token `bg-surface-3`, cyan `#00d4ff` line → indigo `#6366f1`, gradient progress → solid accent, `glass` → card+border
- `client/src/pages/Timeline.jsx` — Spinner atom loading, EmptyState molecule, Badge atom milestone durumu (success/warning), marker renkleri design-token, `glass-strong` tooltip → surface-3+shadow-lg

**Kaldırılan Hackathon Öğeleri:**
- `bg-gradient-to-r from-accent to-accentAlt` (Chat send buton + mesaj baloncuğu)
- `#1a1a2e` hardcoded tooltip arka planı (Analytics 3 grafik)
- `#00d4ff` cyan line chart rengi (Analytics)
- `text-white` / `text-gray-400` hardcoded metin renkleri (Team + Analytics)
- `glass` / `glass-strong` container sınıfları → solid `bg-surface` / `bg-card`
- `getInitials` import (Team — Avatar atom kendi hesaplar)

**Korunan İş Mantığı (%100):**
- Chat: `message:send`, `typing:start/stop` socket event'ları, emoji picker, auto-scroll
- Team: `usersAPI.getAll()`, `tasksAPI.getAll()`, görev haritası, navigate to task detail
- Analytics: `analyticsAPI.get()`, `formatPieData/formatBarData/formatLineData`, JSON/CSV export
- Timeline: `milestonesAPI.getAll()`, `calculateRange/calculatePosition`, now indicator interval
