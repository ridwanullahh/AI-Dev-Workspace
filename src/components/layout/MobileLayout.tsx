import React, { useState, Suspense, lazy } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MobileBottomNav } from '@/components/MobileBottomNav'

interface MobileLayoutProps {
  children?: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState('workspace')

  const handleViewChange = (view: string) => {
    setCurrentView(view)
    navigate(`/${view}`)
  }

  return (
    <div className="mobile-container relative">
      <main className="pb-20">
        <Outlet />
      </main>
      <MobileBottomNav currentView={currentView} onViewChange={handleViewChange} />
    </div>
  )
}