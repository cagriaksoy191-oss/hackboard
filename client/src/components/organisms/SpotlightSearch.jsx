import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../../lib/api';

/* ─── SVG Icons ─── */
const SearchIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const TaskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 12 2 2 4-4" />
  </svg>
);

const MessageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const TYPE_META = {
  task:     { icon: TaskIcon,     label: 'Görev',     color: 'var(--accent-primary)',  bgColor: 'var(--accent-primary-subtle)' },
  message:  { icon: MessageIcon,  label: 'Mesaj',      color: 'var(--accent-info)',     bgColor: 'var(--accent-info-muted)' },
  comment:  { icon: CommentIcon,  label: 'Yorum',      color: 'var(--accent-warning)',  bgColor: 'var(--accent-warning-muted)' },
  activity: { icon: ActivityIcon, label: 'Aktivite',   color: 'var(--accent-success)',  bgColor: 'var(--accent-success-muted)' },
};

const PRIORITY_COLORS = {
  critical: 'var(--priority-critical)',
  high:     'var(--priority-high)',
  medium:   'var(--priority-medium)',
  low:      'var(--priority-low)',
};

/* ──────────────────────────────────────────────
   SearchResultCard — Apple-minimalist result card
   ────────────────────────────────────────────── */
function SearchResultCard({ result, index, isActive, onSelect }) {
  const meta = TYPE_META[result.type] || TYPE_META.task;
  const Icon = meta.icon;
  const entity = result.entity;

  // Build display content
  let title = '';
  let subtitle = '';
  let badges = [];

  if (result.type === 'task') {
    title = entity?.title || 'Görev';
    subtitle = entity?.description?.substring(0, 80) || '';
    if (entity?.priority) badges.push({ text: entity.priority, color: PRIORITY_COLORS[entity.priority] || 'var(--text-muted)' });
    if (entity?.status) badges.push({ text: entity.status, color: 'var(--text-tertiary)' });
    if (entity?.assignee_name) badges.push({ text: entity.assignee_name, color: 'var(--accent-primary)' });
  } else if (result.type === 'message') {
    title = entity?.user_name || 'Mesaj';
    subtitle = entity?.content?.substring(0, 100) || '';
  } else if (result.type === 'comment') {
    title = entity?.user_name || 'Yorum';
    subtitle = entity?.content?.substring(0, 100) || '';
  } else if (result.type === 'activity') {
    title = `${entity?.user_name || 'System'} · ${entity?.action || 'Aktivite'}`;
    subtitle = entity?.details?.substring(0, 100) || '';
    if (entity?.entity_type) badges.push({ text: entity.entity_type, color: 'var(--accent-success)' });
  }

  const scorePercent = Math.round((result.score || 0) * 100);

  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.15 }}
      onClick={() => onSelect(result)}
      className={`
        w-full text-left px-3.5 py-3 flex items-start gap-3
        rounded-xl transition-all duration-100 ease-[var(--ease-apple)]
        ${isActive
          ? 'bg-[var(--accent-primary-subtle)] ring-1 ring-[var(--accent-primary)]/30'
          : 'hover:bg-[var(--interactive-hover)]'
        }
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Type Icon */}
      <div
        className="mt-0.5 p-1.5 rounded-lg shrink-0"
        style={{ backgroundColor: meta.bgColor, color: meta.color }}
      >
        <Icon />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{title}</span>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
            style={{ backgroundColor: meta.bgColor, color: meta.color }}
          >
            {meta.label}
          </span>
        </div>
        {subtitle && (
          <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-1 leading-relaxed">{subtitle}</p>
        )}
        {badges.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            {badges.map((b, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--interactive-muted)]" style={{ color: b.color }}>
                {b.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score Badge */}
      <div className="shrink-0 flex flex-col items-end gap-0.5 mt-0.5">
        <span className="text-[9px] font-mono text-[var(--text-muted)]">
          {scorePercent}%
        </span>
      </div>
    </motion.button>
  );
}

/* ──────────────────────────────────────────────
   SpotlightSearch — macOS Spotlight / Cmd+K modal
   ────────────────────────────────────────────── */
function SpotlightSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState(null); // null = all
  const [searchMode, setSearchMode] = useState('semantic');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setActiveFilter(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Debounced search
  const performSearch = useCallback(async (q, overrideFilter, overrideMode) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const useFilter = overrideFilter !== undefined ? overrideFilter : activeFilter;
      const useMode = overrideMode !== undefined ? overrideMode : searchMode;
      const res = await searchAPI.query({
        q: q.trim(),
        mode: useMode,
        type: useFilter || undefined,
        limit: 20,
      });
      setResults(res.data.results || []);
      setActiveIndex(0);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    }
    setLoading(false);
  }, [searchMode, activeFilter]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(val), 300);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelectResult(results[activeIndex]);
    }
  };

  const handleSelectResult = (result) => {
    onClose();
    if (result.type === 'task' && result.entity?.id) {
      navigate(`/tasks/${result.entity.id}`);
    } else if (result.type === 'message') {
      navigate('/chat');
    } else if (result.type === 'comment' && result.entity?.task_id) {
      navigate(`/tasks/${result.entity.task_id}`);
    } else if (result.type === 'activity' && result.entity?.entity_type === 'task' && result.entity?.entity_id) {
      navigate(`/tasks/${result.entity.entity_id}`);
    } else if (result.type === 'activity') {
      navigate('/timeline');
    }
  };

  const filters = [
    { key: null,       label: 'Tümü' },
    { key: 'task',     label: 'Görevler' },
    { key: 'message',  label: 'Mesajlar' },
    { key: 'comment',  label: 'Yorumlar' },
    { key: 'activity', label: 'Aktiviteler' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[580px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-2xl)] overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)]">
            <div className="text-[var(--text-muted)]">
              <SearchIcon size={18} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Görev, mesaj veya yorum ara..."
              className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            )}
            <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] bg-[var(--interactive-muted)] px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          {/* Filter Tabs */}
          {query.length >= 2 && (
            <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border-subtle)]">
              {filters.map((f) => (
                <button
                  key={f.key || 'all'}
                  onClick={() => {
                    setActiveFilter(f.key);
                    performSearch(query, f.key);
                  }}
                  className={`
                    px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-100
                    ${activeFilter === f.key
                      ? 'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--interactive-hover)]'
                    }
                  `.trim().replace(/\s+/g, ' ')}
                >
                  {f.label}
                </button>
              ))}

              {/* Mode Toggle */}
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => {
                    const next = searchMode === 'semantic' ? 'text' : 'semantic';
                    setSearchMode(next);
                    if (query.length >= 2) performSearch(query, undefined, next);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--interactive-hover)] transition-all"
                  title={searchMode === 'semantic' ? 'Anlamsal Arama' : 'Metin Araması'}
                >
                  {searchMode === 'semantic' ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                      </svg>
                      AI
                    </>
                  ) : (
                    <>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M4 7h16M4 12h10M4 17h13" />
                      </svg>
                      Metin
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {query.length < 2 ? (
              /* Empty state — keyboard hints */
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--interactive-muted)] flex items-center justify-center text-[var(--text-muted)]">
                  <SearchIcon size={20} />
                </div>
                <div>
                  <p className="text-[12px] text-[var(--text-tertiary)]">Arama yapmak için en az 2 karakter yazın</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <kbd className="px-1 py-0.5 rounded bg-[var(--interactive-muted)] text-[9px]">↑↓</kbd> gezin
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <kbd className="px-1 py-0.5 rounded bg-[var(--interactive-muted)] text-[9px]">Enter</kbd> aç
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <kbd className="px-1 py-0.5 rounded bg-[var(--interactive-muted)] text-[9px]">Esc</kbd> kapat
                    </span>
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="py-10 flex items-center justify-center">
                <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                  <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                  Aranıyor...
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center">
                <span className="text-[24px]">🔍</span>
                <p className="text-[12px] text-[var(--text-tertiary)]">
                  <span className="font-semibold text-[var(--text-secondary)]">"{query}"</span> için sonuç bulunamadı
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">Farklı anahtar kelimeler deneyin</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {results.map((result, i) => (
                  <SearchResultCard
                    key={`${result.type}-${result.entity?.id || i}`}
                    result={result}
                    index={i}
                    isActive={i === activeIndex}
                    onSelect={handleSelectResult}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-muted)]">
                {results.length} sonuç · {searchMode === 'semantic' ? 'Anlamsal Arama' : 'Metin Araması'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                  <kbd className="px-1 py-0.5 rounded bg-[var(--interactive-muted)]">⌘</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-[var(--interactive-muted)]">K</kbd>
                  arama
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SpotlightSearch;
