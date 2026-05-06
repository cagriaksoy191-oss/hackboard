## 2024-05-05 - KanbanBoard Performance Optimization
**Learning:** In highly interactive React components like `KanbanBoard` that use drag-and-drop or have complex internal states, expensive operations like filtering large datasets can happen on every render.
**Action:** Use `useMemo` to cache the results of expensive operations, ensuring they are only recalculated when their dependencies change.

## 2024-05-06 - React Socket Real-time State Updates
**Learning:** Real-time data streams via Socket.io provide an opportunity to update frontend state synchronously without triggering large O(N) network requests. For example, rather than calling `tasksAPI.getAll()` on every single `task:updated` event, the payload should contain the mutated entity, which can be immediately mapped into local state arrays.
**Action:** Always intercept real-time events that provide updated models and mutate local React state directly rather than calling fetch/reload APIs, especially on highly interactive views like a Kanban board.
