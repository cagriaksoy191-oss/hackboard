import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { getInitials } from '../lib/stringUtils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/tasks', label: 'Gorevler', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { path: '/team', label: 'Takim', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { path: '/timeline', label: 'Zaman Cizelgesi', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/chat', label: 'Sohbet', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { path: '/analytics', label: 'Analitik', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

function Sidebar({ isOpen, toggle }) {
  const location = useLocation();
  const { user, logoutUser } = useUser();
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 1024;
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarVisible = isDesktop || isOpen;
  const initials = getInitials(user?.name);

  return (
    <>
      {isOpen && !isDesktop && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggle} />
      )}
      <motion.aside
        initial={false}
        animate={{ x: sidebarVisible ? 0 : -280 }}
        className="fixed left-0 top-0 h-full w-64 glass-strong z-50 flex flex-col"
      >
        <div className="p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accentAlt flex items-center justify-center text-white font-bold text-lg">
              H
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">HackBoard</h1>
              <p className="text-xs text-secondary">Hackathon Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => { if (!isDesktop) toggle(); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent/20 text-accent shadow-lg shadow-accent/10'
                    : 'text-secondary hover:text-primary hover-surface-bg'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 space-y-2 border-t border-theme">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl surface-bg">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: user.avatar_color || '#7c3aed' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{user.name}</p>
                <p className="text-xs text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                  Online
                </p>
              </div>
              <button
                onClick={logoutUser}
                className="lg:hidden p-1.5 rounded-lg hover-surface-bg text-secondary hover:text-error transition-all duration-200 hover:scale-110 active:scale-95"
                title="Cikis Yap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

export default Sidebar;
