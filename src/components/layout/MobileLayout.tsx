import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { 
  Home, 
  Folder, 
  Rocket,
  Brain, 
  Code, 
  Settings,
  Menu,
  X,
  Plus,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface MobileLayoutProps {
  children?: React.ReactNode
}

const navItems = [
  { id: 'workspace', label: 'Workspace', icon: Home, path: '/' },
  { id: 'projects', label: 'Projects', icon: Folder, path: '/projects' },
  { id: 'deployments', label: 'Deployments', icon: Rocket, path: '/deployments' },
  { id: 'agents', label: 'Agents', icon: Brain, path: '/agents' },
  { id: 'code', label: 'Code', icon: Code, path: '/code' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
]

export function MobileLayout({ children }: MobileLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const currentPath = location.pathname
  const currentNav = navItems.find(item => item.path === currentPath) || navItems[0]

  const handleNavClick = (path: string) => {
    navigate(path)
    setIsDrawerOpen(false)
  }

  return (
    <div className="mobile-container relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDrawerOpen(true)}
              className="touch-target"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{currentNav.label}</h1>
              <p className="text-xs text-muted-foreground">AI Dev Workspace</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Implement search functionality
                console.log('Search clicked')
              }}
              className="touch-target"
            >
              <Search className="h-5 w-5" />
            </Button>
            
            {/* Add context-aware action button */}
            {currentNav.id === 'projects' && (
              <Button
                size="icon"
                onClick={() => {
                  // Implement new project creation
                  console.log('New project clicked')
                }}
                className="touch-target bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Side Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden",
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsDrawerOpen(false)}
      >
        <div
          className={cn(
            "fixed left-0 top-0 h-full w-80 bg-background border-r border-border transform transition-transform",
            isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold">AI Workspace</h2>
                  <p className="text-xs text-muted-foreground">Mobile Edition</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDrawerOpen(false)}
                className="touch-target"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const isActive = currentPath === item.path
                  const Icon = item.icon
                  
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start touch-target h-12"
                      onClick={() => handleNavClick(item.path)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.label}
                      {item.id === 'projects' && (
                        <Badge variant="secondary" className="ml-auto">
                          3
                        </Badge>
                      )}
                    </Button>
                  )
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-8">
                <h3 className="text-xs font-medium text-muted-foreground mb-3 px-2">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start touch-target h-10"
                    onClick={() => {
                      navigate('/projects')
                      setIsDrawerOpen(false)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start touch-target h-10"
                    onClick={() => {
                      navigate('/agents')
                      setIsDrawerOpen(false)
                    }}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Manage Agents
                  </Button>
                </div>
              </div>
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">U</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">User</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path
            const Icon = item.icon
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-col h-16 px-3 py-2 touch-target rounded-lg",
                  isActive && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleNavClick(item.path)}
              >
                <Icon className={cn(
                  "h-5 w-5 mb-1",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}