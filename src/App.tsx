import React, { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { MobileLayout } from './components/layout/MobileLayout'
import { WorkspacePage } from './pages/WorkspacePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { AgentsPage } from './pages/AgentsPage'
import { CodePage } from './pages/CodePage'
import { SettingsPage } from './pages/SettingsPage'
import { SplashScreen } from './components/SplashScreen'
import { useWorkspaceStore } from './stores/workspaceStore'
import { Toaster } from 'react-hot-toast'

function AppContent() {
  const location = useLocation()
  const { isInitialized, initialize } = useWorkspaceStore()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const initApp = async () => {
      try {
        await initialize()
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
      <Routes>
        <Route path="/" element={<MobileLayout />}>
          <Route index element={<WorkspacePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </div>
  )
}

function App() {
  return (
    <WorkspaceProvider>
      <AppContent />
    </WorkspaceProvider>
  )
}

export default App