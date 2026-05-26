import React from 'react';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from './atoms/Avatar';
import Tooltip from './atoms/Tooltip';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import BackupMenu from './BackupMenu';

/* ──────────────────────────────────────────────
   Header Component — Apple-style top bar
   CountdownTimer removed (hackathon artefact).
   ────────────────────────────────────────────── */
function Header({ toggleSidebar }) {
  const { user, logoutUser } = useUser();
  const { theme } = useTheme();

  return (
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
  );
}

export default Header;
