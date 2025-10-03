import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/database/schema';
import { 
  Brain, 
  MessageSquare, 
  Folder,
  TrendingUp, 
  Clock,
  Plus,
  Rocket,
  Code,
  CheckCircle,
  Github
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function WorkspacePage() {
  const navigate = useNavigate();
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalChats: 0,
    githubConnected: false
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const projects = await db.projects.orderBy('updatedAt').reverse().limit(5).toArray();
      setRecentProjects(projects);

      const allProjects = await db.projects.toArray();
      const activeProjects = allProjects.filter(p => p.status === 'active');
      const chats = await db.chats.toArray();
      const githubToken = await db.settings.get('github_access_token');

      setStats({
        totalProjects: allProjects.length,
        activeProjects: activeProjects.length,
        totalChats: chats.length,
        githubConnected: !!githubToken
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const quickActions = [
    {
      id: 'new-project',
      label: 'New Project',
      icon: Plus,
      color: 'bg-blue-500',
      action: () => navigate('/projects')
    },
    {
      id: 'chat',
      label: 'AI Chat',
      icon: MessageSquare,
      color: 'bg-green-500',
      action: () => navigate('/memory')
    },
    {
      id: 'github',
      label: 'GitHub',
      icon: Github,
      color: 'bg-purple-500',
      action: () => navigate('/settings')
    }
  ];

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to AI Dev Workspace</h1>
        <p className="text-blue-100">
          Your intelligent, mobile-first development environment
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <Folder className="h-8 w-8 text-blue-500 mb-2" />
          <p className="text-2xl font-bold">{stats.totalProjects}</p>
          <p className="text-sm text-muted-foreground">Total Projects</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <Rocket className="h-8 w-8 text-green-500 mb-2" />
          <p className="text-2xl font-bold">{stats.activeProjects}</p>
          <p className="text-sm text-muted-foreground">Active Projects</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <MessageSquare className="h-8 w-8 text-purple-500 mb-2" />
          <p className="text-2xl font-bold">{stats.totalChats}</p>
          <p className="text-sm text-muted-foreground">Conversations</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <Github className={`h-8 w-8 mb-2 ${stats.githubConnected ? 'text-green-500' : 'text-gray-500'}`} />
          <p className="text-sm font-semibold">
            {stats.githubConnected ? 'Connected' : 'Disconnected'}
          </p>
          <p className="text-sm text-muted-foreground">GitHub Status</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                onClick={action.action}
                className="flex flex-col h-24 justify-center"
              >
                <div className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            View All
          </Button>
        </div>
        
        {recentProjects.length > 0 ? (
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate('/projects')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {project.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">
                        {project.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {project.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {project.gitConfig?.isConnected && (
                    <Github className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg p-8 border border-border text-center">
            <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Button onClick={() => navigate('/projects')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}
      </div>

      {/* Getting Started */}
      {stats.totalProjects === 0 && (
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">1. Create a Project</p>
                <p className="text-sm text-muted-foreground">
                  Start by creating your first project or connecting to GitHub
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">2. Configure AI Providers</p>
                <p className="text-sm text-muted-foreground">
                  Connect your AI provider accounts in Settings
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">3. Start Coding</p>
                <p className="text-sm text-muted-foreground">
                  Use AI agents to help you build faster
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Showcase */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">Key Features</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Brain className="h-6 w-6 text-purple-500 mt-1" />
            <div>
              <p className="font-medium text-sm">AI Agents</p>
              <p className="text-xs text-muted-foreground">
                6 specialized agents
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Github className="h-6 w-6 text-gray-500 mt-1" />
            <div>
              <p className="font-medium text-sm">GitHub Integration</p>
              <p className="text-xs text-muted-foreground">
                Seamless sync
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Code className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <p className="font-medium text-sm">Code Editor</p>
              <p className="text-xs text-muted-foreground">
                Monaco powered
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Rocket className="h-6 w-6 text-green-500 mt-1" />
            <div>
              <p className="font-medium text-sm">Deploy</p>
              <p className="text-xs text-muted-foreground">
                One-click deploy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspacePage;
