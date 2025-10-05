import React from 'react';
import {
  LayoutGrid,
  Folder,
  MessageSquare,
  Settings,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick: () => void;
}

interface MobileBottomNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function MobileBottomNav({ currentView, onViewChange }: MobileBottomNavProps) {
  const navItems: NavItem[] = [
    {
      id: 'workspace',
      label: 'Workspace',
      icon: <LayoutGrid size={24} />,
      onClick: () => onViewChange('workspace')
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <Folder size={24} />,
      onClick: () => onViewChange('projects')
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare size={24} />,
      onClick: () => onViewChange('chat')
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={24} />,
      onClick: () => onViewChange('settings')
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center min-w-[64px] py-1 px-2 rounded-lg transition-all ${
              currentView === item.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
