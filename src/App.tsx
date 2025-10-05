import React, { useEffect, useState, Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { MobileLayout } from './components/layout/MobileLayout'
import { SplashScreen } from './components/SplashScreen'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { useWorkspaceStore } from './stores/workspaceStore'
import { Toaster } from 'react-hot-toast'
import { performanceMonitor } from '../services/performanceMonitor'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Lazy load page components for better performance and code splitting
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))
const ProjectsPage = lazy(() => import('./pages/EnhancedProjectsPage'))
const ProjectWorkspacePage = lazy(() => import('./pages/ProjectWorkspacePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))

function AppContent() {
  const location = useLocation()
  const { isInitialized, initialize } = useWorkspaceStore()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const initApp = async () => {
      try {
        await initialize()
        // Initialize performance monitoring after workspace is ready
        await performanceMonitor.initialize()
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        // Hide splash screen after initialization
        setTimeout(() => setShowSplash(false), 2000)
      }
    }

    initApp()
  }, [initialize])

  if (showSplash || !isInitialized) {
    return <SplashScreen />
  }

  return (
    <div className="mobile-container">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<MobileLayout />}>
            <Route index element={<WorkspacePage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/project/:projectId" element={<ProjectWorkspacePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <Toaster />
        <AppContent />
      </WorkspaceProvider>
    </ErrorBoundary>
  )
}

export default App