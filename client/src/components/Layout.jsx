import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import LoginScreen from './LoginScreen';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loginUser, isLoggedIn } = useUser();

  if (!isLoggedIn) {
    return <LoginScreen onLogin={loginUser} />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
