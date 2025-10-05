import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  FileText,
  Terminal,
  GitBranch,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  context?: 'workspace' | 'project' | 'chat';
}

export function FloatingActionButton({ actions, context = 'workspace' }: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3">
      {/* Expanded Actions */}
      {isExpanded && (
        <div className="flex flex-col gap-2 mb-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                setIsExpanded(false);
              }}
              className="flex items-center gap-3 bg-card border border-border rounded-full pl-4 pr-6 py-3 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <div className={`p-2 rounded-full ${action.color || 'bg-primary text-primary-foreground'}`}>
                {action.icon}
              </div>
              <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center ${
          isExpanded ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
        }`}
        aria-label={isExpanded ? 'Close menu' : 'Open menu'}
      >
        {isExpanded ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

// Preset action configurations
export const workspaceActions: FABAction[] = [
  {
    id: 'new-project',
    label: 'New Project',
    icon: <FileText className="h-4 w-4" />,
    onClick: () => console.log('New project'),
    color: 'bg-blue-500'
  },
  {
    id: 'new-chat',
    label: 'New Chat',
    icon: <MessageSquare className="h-4 w-4" />,
    onClick: () => console.log('New chat'),
    color: 'bg-green-500'
  }
];

export const projectActions: FABAction[] = [
  {
    id: 'new-file',
    label: 'New File',
    icon: <FileText className="h-4 w-4" />,
    onClick: () => console.log('New file'),
    color: 'bg-blue-500'
  },
  {
    id: 'new-terminal',
    label: 'New Terminal',
    icon: <Terminal className="h-4 w-4" />,
    onClick: () => console.log('New terminal'),
    color: 'bg-purple-500'
  },
  {
    id: 'new-branch',
    label: 'New Branch',
    icon: <GitBranch className="h-4 w-4" />,
    onClick: () => console.log('New branch'),
    color: 'bg-orange-500'
  },
  {
    id: 'new-chat',
    label: 'New Chat',
    icon: <MessageSquare className="h-4 w-4" />,
    onClick: () => console.log('New chat'),
    color: 'bg-green-500'
  }
];

export const chatActions: FABAction[] = [
  {
    id: 'new-thread',
    label: 'New Thread',
    icon: <MessageSquare className="h-4 w-4" />,
    onClick: () => console.log('New thread'),
    color: 'bg-green-500'
  }
];
