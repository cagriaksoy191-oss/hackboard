## 2024-05-05 - KanbanBoard Performance Optimization
**Learning:** In highly interactive React components like `KanbanBoard` that use drag-and-drop or have complex internal states, expensive operations like filtering large datasets can happen on every render.
**Action:** Use `useMemo` to cache the results of expensive operations, ensuring they are only recalculated when their dependencies change.
