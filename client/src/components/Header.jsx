import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from './atoms/Avatar';
import Tooltip from './atoms/Tooltip';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import BackupMenu from './BackupMenu';
import SpotlightSearch from './organisms/SpotlightSearch';

/* ──────────────────────────────────────────────
   Header Component — Apple-style top bar
   CountdownTimer removed (hackathon artefact).
   ────────────────────────────────────────────── */
function Header({ toggleSidebar }) {
  const { user, logoutUser } = useUser();
  const { theme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <>
      <header className="
        sticky top-0 z-30 w-full shrink-0
        px-4 sm:px-6 h-14
        flex items-center justify-between
        bg-[var(--bg-surface)]/80 backdrop-blur-xl
        border-b border-[var(--border-subtle)]
        transition-all duration-200 ease-[var(--ease-apple)]
      ">
        {/* ─── Left: Hamburger + Breadcrumb ─── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu toggle */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-150"
            aria-label="Menüyü Aç/Kapat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--accent-success-muted)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-success)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-success)]"></span>
            </span>
            <span className="text-[11px] text-[var(--accent-success)] font-semibold">Canlı</span>
          </div>
        </div>

        {/* ─── Center: Search Trigger ─── */}
        <button
          onClick={() => setSearchOpen(true)}
          className="
            hidden sm:flex items-center gap-2.5
            px-3.5 py-1.5 rounded-xl
            bg-[var(--interactive-muted)] border border-[var(--border-subtle)]
            hover:bg-[var(--interactive-hover)] hover:border-[var(--border-default)]
            text-[var(--text-muted)] hover:text-[var(--text-secondary)]
            transition-all duration-150 ease-[var(--ease-apple)]
            min-w-[220px] max-w-[320px]
          "
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[12px] flex-1 text-left truncate">Ara...</span>
          <kbd className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface-3)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search icon */}
        <button
          onClick={() => setSearchOpen(true)}
          className="sm:hidden p-1.5 rounded-lg hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-150"
          aria-label="Ara"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        {/* ─── Right: Actions ─── */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <ThemeToggle />
          <BackupMenu />
          <NotificationBell />

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-[var(--border-default)] mx-1" />

          {/* User */}
          {user && (
            <div className="flex items-center gap-2 pl-1">
              <Avatar
                name={user.name}
                color={user.avatar_color || '#6366f1'}
                size="sm"
              />
              <span className="text-[13px] font-medium text-[var(--text-primary)] hidden md:block truncate max-w-[120px]">
                {user.name}
              </span>
              <Tooltip content="Çıkış Yap" position="bottom">
                <button
                  onClick={logoutUser}
                  className="p-1.5 rounded-md hover:bg-[var(--accent-danger-muted)] text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] transition-all duration-150"
                  aria-label="Çıkış Yap"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </header>

      {/* Spotlight Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <SpotlightSearch isOpen={searchOpen} onClose={closeSearch} />
        )}
      </AnimatePresence>
    </>
  );
}

export default Header;
