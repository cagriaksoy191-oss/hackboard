import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';
import LoginScreen from './LoginScreen';
import Sidebar from './Sidebar';
import Header from './Header';
import RecoveryBanner from './RecoveryBanner';
import { useBackupSnapshot } from '../hooks/useBackupSnapshot';
import { useToast } from './Toast';
import socket from '../lib/socket';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const { loginUser, isLoggedIn } = useUser();
  const { snapshot, serverHealth, showRecovery, dismissRecovery } = useBackupSnapshot();
  const { addToast } = useToast();

  useEffect(() => {
    const handleBackupRestored = () => {
      addToast('Veriler geri yuklendi. Sayfa yenileniyor...', 'info', 4000);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    };

    socket.on('backup:restored', handleBackupRestored);

    return () => {
      socket.off('backup:restored', handleBackupRestored);
    };
  }, [addToast]);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={loginUser} />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <AnimatePresence>
          {showRecovery && (
            <RecoveryBanner
              snapshot={snapshot}
              serverHealth={serverHealth}
              onDismiss={dismissRecovery}
            />
          )}
        </AnimatePresence>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
