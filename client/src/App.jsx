import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import Timeline from './pages/Timeline';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';
import TaskDetail from './pages/TaskDetail';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UserProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Layout><Dashboard /></Layout>} />
                <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
                <Route path="/tasks/:id" element={<Layout><TaskDetail /></Layout>} />
                <Route path="/team" element={<Layout><Team /></Layout>} />
                <Route path="/timeline" element={<Layout><Timeline /></Layout>} />
                <Route path="/chat" element={<Layout><Chat /></Layout>} />
                <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
