# HackBoard - Real-time Collaborative Team Management Panel

![HackBoard](https://img.shields.io/badge/version-1.0.0-00d4ff?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socket.io)
![Database](https://img.shields.io/badge/Database-PostgreSQL_/_SQLite-blue?style=for-the-badge)

HackBoard is an enterprise-grade, real-time, multi-tenant team management platform designed for high-performance squads. It features a Central Design System, customized workflows, sprints and backlog allocation, real-time threaded chat, and an asynchronous RAG (Retrieval-Augmented Generation) hybrid search.

---

## Key Features

1. **Multi-Tenant & RBAC Isolation**: Rigid data boundary filtering via `org_id` and `workspace_id`. Access control roles: `owner`, `admin`, `member`, `viewer` are checked at the middleware level.
2. **Dynamic Workspaces & Custom Workflows**: Dynamic Kanban boards generated directly from database-stored `workflow_stages`. Supports drag-and-drop stage reordering with a 500ms API write debounce and real-time Socket.IO broadcasts.
3. **Sprint & Backlog Management**: Backlog task drawer, drag-and-drop allocation, and automatic active/inactive sprint rollover. Incomplete tasks are rolled back to the backlog or target sprint based on workspace done-stages.
4. **Threaded Chat & Channels**: Workspace-scoped channels with nested Apple Messages-inspired sliding thread reply panels (`ThreadPanel`) leveraging Framer Motion physics.
5. **RAG AI Search & Spotlight**: Cmd+K / Ctrl+K search utilizing Reciprocal Rank Fusion (RRF) to combine fuzzy text LIKE matches and vector cosine similarity embeddings (retrieved from an asynchronous recursive worker loop).
6. **Optimistic Locking Conflict Resolver**: Prevents overlapping edits. When a `409 Conflict` occurs, it renders a side-by-side diff comparison UI allowing the user to select and merge conflict values fields.
7. **Fail-safe Persistence & Restore**: Manual JSON backup exports, automatic local snapshots, and transactional imports with structural checks and client auto-reload.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite + TailwindCSS + Framer Motion |
| **Routing** | React Router DOM v7 |
| **Design System** | Centralized Design Tokens (`design-tokens.css`) |
| **Backend** | Node.js + Express.js (ES Modules) |
| **Database** | PostgreSQL (Supabase / Render) in Production · SQLite (`sql.js`) for Local Fallback |
| **Real-time** | Socket.IO (server) + socket.io-client (client) |
| **Vector Engine** | pgvector (IVFFlat ANN index) with SQLite in-memory cosine fallback |
| **Test Suites** | Node.js native test runner & JSDOM client unit tests |

---

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/cagriaksoy191-oss/hackboard.git
cd hackboard

# Install dependencies for both server and client
npm run install:all
```

### Running Locally

```bash
# Start backend and frontend concurrently in development mode
npm run dev
```

* **Frontend Dev Server**: [http://localhost:5173](http://localhost:5173)
* **Backend Dev Server**: [http://localhost:3001](http://localhost:3001)

No `DATABASE_URL` environment variable is needed for local development. The application automatically detects its absence and falls back to a self-seeding SQLite database (`hackboard.db`).

---

## Testing & Compiling

### Server Test Suite
To execute all backend integration, socket room isolation, and stress tests:
```bash
node --test --test-concurrency=1 (Get-ChildItem -Recurse -Filter *.test.js -Path server | Select-Object -ExpandProperty FullName)
```

### Client Test Suite
To execute all frontend components, gestures, and focus trapping tests:
```bash
cd client
npm run test
```

### Production Build
To compile the React bundle:
```bash
cd client
npm run build
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

* `PORT`: Server port number (default: `3001`)
* `DATABASE_URL`: PostgreSQL connection string (required for PostgreSQL mode)
* `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
* `JWT_SECRET`: Secret key used for signing JWT tokens
* `EMBEDDING_PROVIDER`: `gemini` (default) \| `openai` \| `mock`
* `GEMINI_API_KEY`: API key for Gemini embedding model
* `OPENAI_API_KEY`: API key for OpenAI embedding model

---

## API Endpoints (v1)

### Authentication
* `POST /api/v1/auth/register`: Create organization and user.
* `POST /api/v1/auth/login`: Authenticate and issue tokens.
* `POST /api/v1/auth/refresh`: Rotate expired access token.
* `POST /api/v1/auth/logout`: Revoke active refresh tokens.
* `GET /api/v1/auth/health`: Health monitoring endpoint.

### Tasks & Workflows
* `GET /api/v1/tasks`: Fetch tasks (scoped to workspace).
* `POST /api/v1/tasks`: Create task.
* `PUT /api/v1/tasks/:id`: Update task fields (checked via `version` optimistic locking).
* `DELETE /api/v1/tasks/:id`: Cascading delete of task.
* `PATCH /api/v1/tasks/:id/status`: Update task status.
* `GET /api/v1/workflows`: List custom stages.
* `PATCH /api/v1/workflows/reorder`: Update stage position ordering.
* `DELETE /api/v1/workflows/:id`: Stage deletion with task-reassignment fallback.

### Chat Channels
* `GET /api/v1/channels`: Fetch channels (scoped to workspace, with auto-fallback to default).
* `POST /api/v1/channels`: Create chat channel.
* `GET /api/v1/messages`: Paginated message list (`before_id` cursor).
* `GET /api/v1/messages/:id/thread`: Fetch nested replies.

### Backup & Restore
* `GET /api/backup/export`: JSON snapshot of organization tables.
* `GET /api/backup/health`: Table row counts and latest timestamp.
* `POST /api/backup/import`: Load JSON snapshot inside a safe SQL transaction block.

---

## Architecture & Database Schema

The database consists of **14 tables** establishing tenant isolation:
- `users`: User accounts and hashed credentials.
- `organizations` & `org_memberships`: Tenant context and RBAC definitions.
- `workspaces`: Sub-tenant team environments.
- `workflow_stages`: Customized Kanban states.
- `tasks`, `subtasks` & `comments`: Scoped boards and backlogs.
- `channels` & `messages`: Threaded conversation logs.
- `embeddings`: RAG vectors registry.
- `sprints` & `milestones`: Delivery tracking cycles.
