import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tasksAPI, usersAPI, workflowsAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import socket from '../lib/socket';
import TaskCard from './organisms/TaskCard';
import KanbanColumn from './organisms/KanbanColumn';
import { EmptyState } from './molecules';
import { SearchBar } from './molecules';
import { Button } from './atoms';
import CreateTaskModal from './CreateTaskModal';

/* ──────────────────────────────────────────────
   Default columns — fallback when no custom workflow
   ────────────────────────────────────────────── */
const DEFAULT_COLUMNS = [
  { id: 'todo',        title: 'Yapılacak',     color: '#3b82f6', slug: 'todo' },
  { id: 'in-progress', title: 'Devam Ediyor',  color: '#f59e0b', slug: 'in-progress' },
  { id: 'testing',     title: 'Test',           color: '#8b5cf6', slug: 'testing' },
  { id: 'done',        title: 'Tamamlandı',     color: '#22c55e', slug: 'done' },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */
const filterTasks = (tasks, searchQuery, filterPriority, filterUser) => {
  return tasks.filter((t) => {
    const matchesSearch = searchQuery === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesUser = filterUser === 'all' || t.assigned_to === parseInt(filterUser);
    return matchesSearch && matchesPriority && matchesUser;
  });
};

/* ──────────────────────────────────────────────
   KanbanBoard Component
   ────────────────────────────────────────────── */
function KanbanBoard() {
  const { user } = useUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [highlightColumn, setHighlightColumn] = useState(null);
  const [pulseTaskId, setPulseTaskId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [kanbanUsers, setKanbanUsers] = useState([]);
  const [workflowStages, setWorkflowStages] = useState(null);

  // Compute columns: use custom workflow stages if defined, otherwise default
  const columns = useMemo(() => {
    if (workflowStages && workflowStages.length > 0) {
      return workflowStages.map(s => ({
        id: String(s.id),
        title: s.name,
        color: s.color || '#6366f1',
        isCustom: true,
        slug: s.slug,
      }));
    }
    return DEFAULT_COLUMNS.map(col => ({ ...col, isCustom: false }));
  }, [workflowStages]);

  useEffect(() => {
    loadTasks();
    usersAPI.getAll().then((res) => setKanbanUsers(res.data)).catch(() => {});
    workflowsAPI.getAll().then((res) => setWorkflowStages(res.data)).catch(() => setWorkflowStages(null));

    // ⚡ Socket listeners — optimistic local state updates
    const handleTaskMoved = (updatedTask) => setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    const handleTaskDeleted = (data) => setTasks((prev) => prev.filter((t) => t.id !== data.id));
    const handleTaskUpdated = (updatedTask) => setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    const handleTaskCreated = (newTask) => setTasks((prev) => [newTask, ...prev]);
    const handleWorkflowReorder = (stages) => setWorkflowStages(stages);
    const handleTasksRefresh = () => loadTasks();

    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:created', handleTaskCreated);
    socket.on('workflow:reordered', handleWorkflowReorder);
    socket.on('tasks:refresh', handleTasksRefresh);

    const handleReconnectRefetch = () => {
      console.info('[KanbanBoard] Socket reconnected. Triggering targeted refetch...');
      loadTasks();
      workflowsAPI.getAll().then((res) => setWorkflowStages(res.data)).catch(() => {});
    };
    window.addEventListener('socket:reconnect-refetch', handleReconnectRefetch);

    return () => {
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:created', handleTaskCreated);
      socket.off('workflow:reordered', handleWorkflowReorder);
      socket.off('tasks:refresh', handleTasksRefresh);
      window.removeEventListener('socket:reconnect-refetch', handleReconnectRefetch);
    };
  }, []);

  const loadTasks = () => {
    tasksAPI.getAll().then((res) => { setTasks(res.data); setLoading(false); });
  };

  /* ── Drag & Drop ── */
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHighlightColumn(colId);
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    setHighlightColumn(null);
    if (draggedTaskId) {
      const targetCol = columns.find(c => String(c.id) === String(colId));
      if (targetCol) {
        if (targetCol.isCustom) {
          const stage = workflowStages.find(s => String(s.id) === String(colId));
          if (stage) {
            let statusStr = 'in-progress';
            if (stage.is_done_state === 1) {
              statusStr = 'done';
            } else if (stage.slug.includes('todo') || stage.slug.includes('yapilacak')) {
              statusStr = 'todo';
            } else if (stage.slug.includes('test')) {
              statusStr = 'testing';
            }
            socket.emit('task:move', { 
              id: draggedTaskId, 
              status: statusStr, 
              workflow_stage_id: stage.id, 
              user_id: user?.id || 1 
            });
          }
        } else {
          socket.emit('task:move', { id: draggedTaskId, status: colId, user_id: user?.id || 1 });
        }
      }
      setPulseTaskId(draggedTaskId);
      setDraggedTaskId(null);
      setTimeout(() => setPulseTaskId(null), 600);
    }
  };

  const handleDeleteTask = (taskId) => {
    socket.emit('task:delete', { id: taskId, user_id: user?.id || 1 });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  /* ── Filters ── */
  const filteredTasks = useMemo(() => filterTasks(tasks, searchQuery, filterPriority, filterUser), [tasks, searchQuery, filterPriority, filterUser]);
  const hasActiveFilters = searchQuery !== '' || filterPriority !== 'all' || filterUser !== 'all';

  const selectClass = (val) => `
    px-3 py-2 rounded-lg text-[13px] font-medium
    bg-[var(--bg-input)] border border-[var(--border-input)]
    text-[var(--text-primary)]
    focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)]
    transition-all duration-150 ease-[var(--ease-apple)]
    ${val !== 'all' ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]' : ''}
  `.trim().replace(/\s+/g, ' ');

  /* ── Skeleton ── */
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {columns.map((col) => (
        <div
          key={col.id}
          className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 min-h-[300px]"
        >
          <div className="flex items-center gap-2 px-1 mb-3">
            <div className="w-2.5 h-2.5 rounded-full skeleton" />
            <div className="h-4 w-20 skeleton rounded" />
            <div className="ml-auto h-5 w-8 skeleton rounded-md" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5">
                <div className="h-4 skeleton rounded w-3/4 mb-2" />
                <div className="h-3 skeleton rounded w-1/2 mb-3" />
                <div className="flex justify-between items-center">
                  <div className="h-5 w-5 skeleton rounded-full" />
                  <div className="h-3 skeleton rounded w-8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  /* ── Empty icon ── */
  const emptyIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );

  return (
    <div className="relative">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Kanban Board</h3>
        <Button
          variant="accent"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          Yeni Görev
        </Button>
      </div>

      {/* ─── Filters ─── */}
      <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Görev ara..."
              size="md"
            />
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={selectClass(filterPriority)}
          >
            <option value="all" className="option-surface">Tüm Öncelikler</option>
            <option value="critical" className="option-surface">Kritik</option>
            <option value="high" className="option-surface">Yüksek</option>
            <option value="medium" className="option-surface">Orta</option>
            <option value="low" className="option-surface">Düşük</option>
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={selectClass(filterUser)}
          >
            <option value="all" className="option-surface">Tüm Kişiler</option>
            {kanbanUsers.map((u) => (
              <option key={u.id} value={u.id} className="option-surface">{u.name}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setSearchQuery(''); setFilterPriority('all'); setFilterUser('all'); }}
            >
              Temizle
            </Button>
          )}
        </div>
      </div>

      {/* ─── Board ─── */}
      {loading ? renderSkeleton() : filteredTasks.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={hasActiveFilters ? 'Filtre sonucu bulunamadı' : 'Henüz görev yok'}
          description={hasActiveFilters ? 'Farklı filtreler deneyebilirsiniz.' : 'Hadi ilk görevi ekleyelim!'}
          onAction={hasActiveFilters ? undefined : () => setShowCreateModal(true)}
          actionLabel="Görev Ekle"
        />
      ) : (
        <div
          className={`grid gap-3 ${
            columns.length <= 4
              ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
              : 'overflow-x-auto'
          }`}
          style={columns.length > 4 ? {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))`,
          } : undefined}
          id="kanban-board-container"
        >
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => {
              if (col.isCustom) {
                if (String(t.workflow_stage_id) === String(col.id)) return true;
                if (!t.workflow_stage_id) {
                  if (col.slug === t.status) return true;
                  if (t.status === 'done' && (col.slug === 'completed' || col.slug === 'finish' || col.slug === 'biten' || col.slug === 'tamamlandi')) return true;
                  if (t.status === 'in-progress' && (col.slug === 'active' || col.slug === 'progress' || col.slug === 'devam-ediyor' || col.slug === 'calisiliyor')) return true;
                  if (t.status === 'todo' && (col.slug === 'backlog' || col.slug === 'yapilacak' || col.slug === 'yapilacaklar')) return true;
                  if (t.status === 'testing' && (col.slug === 'test' || col.slug === 'control' || col.slug === 'kontrol')) return true;
                }
                return false;
              }
              return t.status === col.id;
            });
            return (
              <div
                id={`kanban-col-${col.id}`}
                key={col.id}
                className="scroll-mt-[100px]"
              >
                <KanbanColumn
                  title={col.title}
                  color={col.color}
                  count={colTasks.length}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <AnimatePresence>
                    {colTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        animate={pulseTaskId === task.id ? { scale: [1, 1.02, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <TaskCard
                          task={task}
                          onDragStart={handleDragStart}
                          onDelete={handleDeleteTask}
                          onEdit={loadTasks}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </KanbanColumn>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create Task Modal ─── */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); loadTasks(); }}
      />
    </div>
  );
}

export default KanbanBoard;
