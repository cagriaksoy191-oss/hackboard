import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import Avatar from './atoms/Avatar';
import Tooltip from './atoms/Tooltip';

/* ──────────────────────────────────────────────
   Navigation Items
   ────────────────────────────────────────────── */
const navItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/tasks',
    label: 'Görevler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    path: '/sprints',
    label: 'Sprint',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    path: '/team',
    label: 'Takım',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    path: '/timeline',
    label: 'Zaman Çizelgesi',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    path: '/chat',
    label: 'Sohbet',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    path: '/analytics',
    label: 'Analitik',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    path: '/settings/workflow',
    label: 'İş Akışı',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

const getInitialDesktopState = () => {
  if (typeof window !== 'undefined') return window.innerWidth >= 1024;
  return false;
};

/* ──────────────────────────────────────────────
   Sidebar Component
   ────────────────────────────────────────────── */
function Sidebar({ isOpen, toggle }) {
  const location = useLocation();
  const { user, logoutUser } = useUser();
  const [isDesktop, setIsDesktop] = useState(getInitialDesktopState);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scrolling when sidebar is open on mobile
  useEffect(() => {
    if (isOpen && !isDesktop) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen, isDesktop]);

  const sidebarVisible = isDesktop || isOpen;

  return (
    <>
      {/* Overlay — mobile only */}
      {isOpen && !isDesktop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[var(--bg-overlay)] z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarVisible ? 0 : -280 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed left-0 top-0 h-full w-[260px] z-50 flex flex-col
          bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]"
      >
        {/* ─── Logo & Brand ─── */}
        <div className="px-5 py-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold text-base shadow-[var(--shadow-accent)]">
              H
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">HackBoard</h1>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium">Enterprise Platform</p>
            </div>
          </div>
        </div>

        {/* ─── Navigation ─── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            Navigasyon
          </p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => { if (!isDesktop) toggle(); }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium
                  transition-all duration-150 ease-[var(--ease-apple)]
                  ${isActive
                    ? 'bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--interactive-hover)]'
                  }
                `.trim().replace(/\s+/g, ' ')}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                  {item.icon}
                </span>
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ─── User Section ─── */}
        <div className="px-3 py-3 border-t border-[var(--border-subtle)]">
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[var(--interactive-muted)]">
              <Avatar
                name={user.name}
                color={user.avatar_color || '#6366f1'}
                size="sm"
                showStatus
                isOnline
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
                <p className="text-[10px] text-[var(--accent-success)] font-medium flex items-center gap-1">
                  Çevrimiçi
                </p>
              </div>
              <Tooltip content="Çıkış Yap" position="top">
                <button
                  onClick={logoutUser}
                  className="lg:hidden p-1.5 rounded-md hover:bg-[var(--accent-danger-muted)] text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] transition-all duration-150"
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
      </motion.aside>
    </>
  );
}

export default Sidebar;
