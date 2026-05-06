## 2025-02-24 - Unvalidated SQL Query Limit parameter
**Vulnerability:** `limit` query parameter on `GET /api/notifications` API endpoint allowed negative and large inputs. SQLite treats negative limit values as unbounded queries.
**Learning:** Negative `LIMIT` values bypassing restrictions to dump arbitrary amounts of data.
**Prevention:** Explicitly validate numeric inputs such as `limit`, ensuring they are strictly positive and reasonably capped.

## 2025-02-24 - API Authentication Bypass via Broad Path Matching
**Vulnerability:** The `requireAuth` middleware unconditionally allowed requests if the path started with `/api/users`. This exposed sensitive endpoints (like `PUT /api/users/:id`, `DELETE /api/users/:id`, `PATCH /api/users/:id/status`) to unauthenticated attackers.
**Learning:** Broad path-based exclusions in authentication middleware are dangerous because they apply to all HTTP methods on that path.
**Prevention:** Always restrict authentication bypasses by explicitly combining the path check with the required HTTP methods (e.g., `req.method === 'GET' || req.method === 'POST'`).
