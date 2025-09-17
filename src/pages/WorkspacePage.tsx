import React, { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useChatStore } from '@/stores/chatStore'
import { 
  Brain, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  Plus,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  action: () => void
}

const quickActions: QuickAction[] = [
  {
    id: 'new-chat',
    label: 'New Chat',
    icon: MessageSquare,
    color: 'text-blue-500',
    action: () => console.log('New chat')
  },
  {
    id: 'new-project',
    label: 'New Project',
    icon: Plus,
    color: 'text-green-500',
    action: () => console.log('New project')
  },
  {
    id: 'browse-agents',
    label: 'Browse Agents',
    icon: Brain,
    color: 'text-purple-500',
    action: () => console.log('Browse agents')
  }
]

interface ActivityItem {
  id: string
  type: 'message' | 'project' | 'task' | 'agent'
  title: string
  description: string
  timestamp: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export function WorkspacePage() {
  const { 
    projects, 
    currentProject, 
    agents, 
    tasks, 
    isLoading, 
    error,
    setCurrentProject 
  } = useWorkspaceStore()
  
  const { messages, sendMessage, isStreaming, streamingMessage } = useChatStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    // Generate recent activities
    const recentActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'message',
        title: 'New conversation started',
        description: 'Chat with AI assistant about project architecture',
        timestamp: '2 minutes ago',
        icon: MessageSquare,
        color: 'text-blue-500'
      },
      {
        id: '2',
        type: 'project',
        title: 'Project updated',
        description: 'Mobile App project progress increased to 75%',
        timestamp: '1 hour ago',
        icon: TrendingUp,
        color: 'text-green-500'
      },
      {
        id: '3',
        type: 'task',
        title: 'Task completed',
        description: 'Code review for authentication module finished',
        timestamp: '3 hours ago',
        icon: Clock,
        color: 'text-purple-500'
      }
    ]
    setActivities(recentActivities)
  }, [projects, messages, tasks])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    try {
      await sendMessage(newMessage.trim(), currentProject?.id)
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto animate-pulse">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-destructive rounded-lg flex items-center justify-center mx-auto">
            <Brain className="w-6 h-6 text-destructive-foreground" />
          </div>
          <p className="text-destructive font-medium">Error loading workspace</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">
            Your AI development workspace is ready
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.id}
                variant="outline"
                className="flex-col h-20 p-3 touch-target"
                onClick={action.action}
              >
                <Icon className={`h-6 w-6 mb-1 ${action.color}`} />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Current Project Overview */}
      {currentProject && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Current Project</h2>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">{currentProject.name}</h3>
              <p className="text-sm text-muted-foreground">{currentProject.description}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentProject.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{currentProject.progress}%</span>
              </div>
              <Badge variant="outline">{currentProject.type}</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Quick Chat */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Quick Chat</h2>
        </div>
        
        {/* Chat Messages */}
        <div className="max-h-64 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No messages yet. Start a conversation!</p>
            </div>
          ) : (
            messages.slice(-5).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {/* Streaming Message */}
          {isStreaming && streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-3 py-2 bg-muted text-muted-foreground">
                <p className="text-sm">{streamingMessage}</p>
                <div className="flex gap-1 mt-1">
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isStreaming}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isStreaming}
              size="icon"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent Activity</h2>
          <Button variant="ghost" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </div>
        
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                <div className={`p-2 rounded-lg bg-muted ${activity.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{activity.title}</h4>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Active Projects</span>
          </div>
          <p className="text-2xl font-bold">{projects.filter(p => p.status === 'active').length}</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Available Agents</span>
          </div>
          <p className="text-2xl font-bold">{agents.filter(a => a.isActive).length}</p>
        </div>
      </div>
    </div>
  )
}

export default WorkspacePage;