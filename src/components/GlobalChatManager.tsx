import React, { useState, useEffect } from 'react';
import { db, type ChatMessage, type Project } from '@/database/schema';
import {
  MessageSquare,
  Search,
  Filter,
  Clock,
  ChevronDown,
  ChevronRight,
  Circle,
  Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectChatSummary {
  project: Project;
  threadCount: number;
  totalMessages: number;
  lastMessageAt?: Date;
  unreadCount: number;
}

interface RecentChat {
  projectId: string;
  projectName: string;
  threadId?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

interface GlobalChatManagerProps {
  onSelectChat: (projectId: string, threadId?: string) => void;
  onClose: () => void;
}

export function GlobalChatManager({ onSelectChat, onClose }: GlobalChatManagerProps) {
  const [projects, setProjects] = useState<ProjectChatSummary[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recent');

  useEffect(() => {
    loadChatData();
  }, []);

  const loadChatData = async () => {
    try {
      const allProjects = await db.projects.toArray();
      const allMessages = await db.chats.toArray();

      // Build project summaries
      const projectSummaries: ProjectChatSummary[] = [];
      
      for (const project of allProjects) {
        const projectMessages = allMessages.filter(m => m.projectId === project.id);
        
        if (projectMessages.length === 0) continue;

        const threadIds = new Set(projectMessages.map(m => m.threadId || 'default'));
        const lastMessage = projectMessages.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        )[0];

        projectSummaries.push({
          project,
          threadCount: threadIds.size,
          totalMessages: projectMessages.length,
          lastMessageAt: lastMessage.timestamp,
          unreadCount: 0 // TODO: Implement read tracking
        });
      }

      // Sort by last message
      projectSummaries.sort((a, b) => 
        (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0)
      );

      setProjects(projectSummaries);

      // Build recent chats (last 10 conversations)
      const recentChatMap = new Map<string, RecentChat>();
      
      allMessages
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50)
        .forEach(msg => {
          const key = `${msg.projectId}-${msg.threadId || 'default'}`;
          
          if (!recentChatMap.has(key)) {
            const project = allProjects.find(p => p.id === msg.projectId);
            if (project) {
              recentChatMap.set(key, {
                projectId: msg.projectId,
                projectName: project.name,
                threadId: msg.threadId,
                lastMessage: msg.content.slice(0, 100),
                lastMessageAt: msg.timestamp,
                unreadCount: 0
              });
            }
          }
        });

      setRecentChats(Array.from(recentChatMap.values()).slice(0, 10));
    } catch (error) {
      console.error('Failed to load chat data:', error);
    }
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleChatSelect = (projectId: string, threadId?: string) => {
    onSelectChat(projectId, threadId);
    onClose();
  };

  const filteredProjects = projects.filter(p =>
    p.project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecentChats = recentChats.filter(c =>
    c.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="bg-card w-full sm:max-w-2xl sm:rounded-lg sm:max-h-[80vh] h-[90vh] sm:h-auto flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">All Chats</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start px-4 border-b">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="projects">By Project</TabsTrigger>
          </TabsList>

          {/* Recent Chats Tab */}
          <TabsContent value="recent" className="flex-1 overflow-y-auto m-0">
            {filteredRecentChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recent chats</h3>
                <p className="text-sm text-muted-foreground">
                  Start a conversation to see it here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRecentChats.map((chat, index) => (
                  <div
                    key={`${chat.projectId}-${chat.threadId || 'default'}-${index}`}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleChatSelect(chat.projectId, chat.threadId)}
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium truncate">{chat.projectName}</h3>
                          {chat.unreadCount > 0 && (
                            <Badge variant="default" className="ml-2">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {chat.lastMessage}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(chat.lastMessageAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="flex-1 overflow-y-auto m-0">
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Folder className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects with chats</h3>
                <p className="text-sm text-muted-foreground">
                  Create a project and start chatting
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredProjects.map((projectSummary) => (
                  <div key={projectSummary.project.id}>
                    {/* Project Header */}
                    <div
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => toggleProjectExpanded(projectSummary.project.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {expandedProjects.has(projectSummary.project.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Folder className="h-5 w-5 text-primary flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {projectSummary.project.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Badge variant="outline" className="text-xs">
                                {projectSummary.threadCount} thread{projectSummary.threadCount !== 1 ? 's' : ''}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {projectSummary.totalMessages} message{projectSummary.totalMessages !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {projectSummary.unreadCount > 0 && (
                          <Badge variant="default">
                            {projectSummary.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Thread List (when expanded) */}
                    {expandedProjects.has(projectSummary.project.id) && (
                      <div className="bg-muted/30 border-l-2 border-primary ml-4">
                        <div
                          className="p-3 pl-8 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleChatSelect(projectSummary.project.id)}
                        >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">View all chats</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
