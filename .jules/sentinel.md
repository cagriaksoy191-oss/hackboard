# Security Fix: JWT Authentication Migration

## Key Learnings & Patterns
- **Vulnerability**: Relying on unverified, client-provided custom headers (like `X-User-Id`) for authentication allows for trivial impersonation and privilege escalation.
- **Enterprise-Grade JWT Implementation**:
  1. **Secret Management**: JWT secrets must never be hardcoded in the codebase. Always use environment variables (`process.env.JWT_SECRET`) with fallbacks specifically restricted to the `test` environment (`NODE_ENV === 'test'`).
  2. **Token Lifecycle**: Tokens must always have an explicit expiration limit (e.g., `{ expiresIn: '24h' }`) to minimize the window of opportunity for token theft.
  3. **Algorithm Enforcement**: To prevent algorithm downgrade attacks (like the `none` algorithm vulnerability), explicitly define the expected algorithms during verification (e.g., `algorithms: ['HS256']`).
  4. **Frontend Resilience**: API clients (Axios) should implement global response interceptors for `401 Unauthorized` statuses. This interceptor must purge stored authentication data (`localStorage`) and trigger an application-wide logout event to prevent infinite request loops with expired tokens.
  5. **Socket Parity**: WebSocket connections (Socket.IO) require synchronized authentication states. On login/logout, the active socket must be explicitly disconnected, its `auth` payload updated to the new token (or cleared), and then reconnected to ensure real-time events are correctly authorized.

## Testing
- Integration tests simulating HTTP requests and Socket connections must be thoroughly updated to sign and pass valid JWTs instead of the old headers to prevent CI pipeline regressions.
