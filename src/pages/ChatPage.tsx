import React, { useState, useEffect, useRef } from 'react';
import { db, type ChatMessage, type Project } from '@/database/schema';
import { useChatStore } from '@/stores/chatStore';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  Plus,
  Settings,
  Trash2,
  Download,
  Upload,
  Search,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AGENT_TYPES = [
  { id: 'general', name: 'General', description: 'All-purpose assistant', icon: '🤖' },
  { id: 'planner', name: 'Planner', description: 'Task planning & architecture', icon: '📋' },
  { id: 'coder', name: 'Coder', description: 'Code generation & review', icon: '💻' },
  { id: 'designer', name: 'Designer', description: 'UI/UX design assistance', icon: '🎨' },
  { id: 'debugger', name: 'Debugger', description: 'Bug fixing & debugging', icon: '🐛' },
  { id: 'reviewer', name: 'Reviewer', description: 'Code review & quality', icon: '👀' },
  { id: 'deployer', name: 'Deployer', description: 'Deployment & DevOps', icon: '🚀' }
];

export function ChatPage() {
  const { messages, isLoading, sendMessage, clearMessages, exportChat, importChat } = useChatStore();
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('general');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadProjects();
    scrollToBottom();
  }, [messages]);

  const loadProjects = async () => {
    const allProjects = await db.projects.toArray();
    setProjects(allProjects);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Auto-resize textarea back to default
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(userMessage, {
      agentType: selectedAgent,
      projectId: selectedProject || undefined
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleExportChat = async () => {
    const data = await exportChat();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    await importChat(text);
    e.target.value = '';
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear all messages?')) {
      clearMessages();
    }
  };

  const selectedAgentData = AGENT_TYPES.find(a => a.id === selectedAgent) || AGENT_TYPES[0];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">AI Chat</h1>
              <p className="text-xs text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportChat}
              title="Export chat"
            >
              <Download className="h-4 w-4" />
            </Button>
            <label>
              <Button
                variant="ghost"
                size="icon"
                title="Import chat"
                asChild
              >
                <span>
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportChat}
                    className="hidden"
                  />
                </span>
              </Button>
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Agent & Project Selection */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <span>{selectedAgentData.icon}</span>
                    <span className="text-sm">{selectedAgentData.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPES.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.icon}</span>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">{agent.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={selectedProject || ''} onValueChange={(val) => setSelectedProject(val || null)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No project">
                  {selectedProject && projects.find(p => p.id === selectedProject)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-muted-foreground">No project</span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-card rounded-lg p-8 border border-border max-w-md">
              <Bot className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose an AI agent and start chatting. Agents can help with coding, planning, debugging, and more.
              </p>
              <div className="grid grid-cols-2 gap-2 text-left">
                {AGENT_TYPES.slice(0, 4).map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{agent.icon}</span>
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{agent.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-primary' : 'bg-muted'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Bot className="h-4 w-4 text-foreground" />
                  )}
                </div>
                <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    {message.metadata?.agentType && message.role === 'assistant' && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <Badge variant="outline" className="text-xs">
                          {AGENT_TYPES.find(a => a.id === message.metadata?.agentType)?.name || 'AI'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="inline-block rounded-lg p-3 bg-card border border-border">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedAgentData.name}...`}
              className="min-h-[44px] max-h-[200px] resize-none"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="flex-shrink-0 h-11 w-11"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

export default ChatPage;
