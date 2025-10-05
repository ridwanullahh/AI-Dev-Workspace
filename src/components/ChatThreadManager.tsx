import React, { useState, useEffect } from 'react';
import { db, type ChatMessage } from '@/database/schema';
import {
  MessageSquare,
  Plus,
  Trash2,
  Archive,
  Clock,
  Search,
  ChevronRight,
  MoreVertical,
  Edit2,
  Pin,
  PinOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface ChatThread {
  id: string;
  projectId: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  messageCount: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
}

interface ChatThreadManagerProps {
  projectId: string;
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
}

export function ChatThreadManager({ 
  projectId, 
  activeThreadId, 
  onSelectThread,
  onCreateThread 
}: ChatThreadManagerProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadThreads();
  }, [projectId, showArchived]);

  const loadThreads = async () => {
    try {
      // Get all messages for this project
      const messages = await db.chats
        .where('projectId')
        .equals(projectId)
        .toArray();

      // Group by threadId
      const threadMap = new Map<string, ChatThread>();
      
      messages.forEach((msg) => {
        const threadId = msg.threadId || 'default';
        
        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, {
            id: threadId,
            projectId,
            title: threadId === 'default' ? 'General Chat' : `Thread ${threadId.slice(0, 8)}`,
            messageCount: 0,
            isPinned: false,
            isArchived: false,
            createdAt: msg.timestamp
          });
        }

        const thread = threadMap.get(threadId)!;
        thread.messageCount++;
        
        if (!thread.lastMessageAt || msg.timestamp > thread.lastMessageAt) {
          thread.lastMessageAt = msg.timestamp;
          thread.lastMessage = msg.content.slice(0, 100);
        }
      });

      let threadList = Array.from(threadMap.values());
      
      // Filter archived
      if (!showArchived) {
        threadList = threadList.filter(t => !t.isArchived);
      }

      // Sort: pinned first, then by last message
      threadList.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0);
      });

      setThreads(threadList);
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Delete this thread and all its messages?')) return;

    try {
      await db.chats
        .where('threadId')
        .equals(threadId)
        .delete();
      
      await loadThreads();
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const handleArchiveThread = async (threadId: string) => {
    // In a real implementation, this would update a thread settings table
    await loadThreads();
  };

  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chat Threads</h2>
          <Button size="sm" onClick={onCreateThread}>
            <Plus className="h-4 w-4 mr-2" />
            New Thread
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads..."
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showArchived ? 'default' : 'outline'}
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived
          </Button>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No threads found' : 'No threads yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search query'
                : 'Create your first chat thread to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={onCreateThread}>
                <Plus className="h-4 w-4 mr-2" />
                Create Thread
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                  activeThreadId === thread.id ? 'bg-muted' : ''
                }`}
                onClick={() => onSelectThread(thread.id)}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{thread.title}</h3>
                        {thread.isPinned && (
                          <Pin className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteThread(thread.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>

                    {thread.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {thread.lastMessage}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {thread.lastMessageAt
                          ? new Date(thread.lastMessageAt).toLocaleString()
                          : 'No messages'}
                      </span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
