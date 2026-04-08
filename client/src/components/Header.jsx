import React from 'react';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import CountdownTimer from './CountdownTimer';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import BackupMenu from './BackupMenu';

function Header({ toggleSidebar }) {
  const { user, logoutUser } = useUser();
  const { theme } = useTheme();
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <header className="glass border-b border-theme px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover-surface-bg text-secondary hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <CountdownTimer />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-success font-medium">Canli</span>
        </div>
        <ThemeToggle />
        <BackupMenu />
        <NotificationBell />
        {user && (
          <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-theme">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white"
              style={{ backgroundColor: user.avatar_color || '#7c3aed' }}
            >
              {initials}
            </div>
            <span className="text-sm font-medium text-primary hidden md:inline">{user.name}</span>
            <button
              onClick={logoutUser}
              className="ml-0.5 sm:ml-1 p-1 sm:p-1.5 rounded-lg hover:bg-error/20 text-secondary hover:text-error transition-all duration-200 hover:scale-110 active:scale-95"
              title="Cikis Yap"
            >
              <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
