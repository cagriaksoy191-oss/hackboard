import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';

const Team = lazy(() => import('./pages/Team'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Chat = lazy(() => import('./pages/Chat'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Yukleniyor...</span>
      </div>
    </div>
  );
}

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
                <Route path="/tasks/:id" element={<Layout><Suspense fallback={<LoadingFallback />}><TaskDetail /></Suspense></Layout>} />
                <Route path="/team" element={<Layout><Suspense fallback={<LoadingFallback />}><Team /></Suspense></Layout>} />
                <Route path="/timeline" element={<Layout><Suspense fallback={<LoadingFallback />}><Timeline /></Suspense></Layout>} />
                <Route path="/chat" element={<Layout><Suspense fallback={<LoadingFallback />}><Chat /></Suspense></Layout>} />
                <Route path="/analytics" element={<Layout><Suspense fallback={<LoadingFallback />}><Analytics /></Suspense></Layout>} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
