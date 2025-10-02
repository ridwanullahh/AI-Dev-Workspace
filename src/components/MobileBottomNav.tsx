import React from 'react';
import { useProject } from '../contexts/ProjectContext';
import { 
  Home, 
  MessageSquare, 
  CheckSquare, 
  Terminal as TerminalIcon, 
  GitBranch, 
  Settings,
  Cpu
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
  const { currentProject, projectTodos, projectTerminals } = useProject();

  const activeTodos = projectTodos.filter(t => t.status === 'in_progress').length;
  const activeTerminals = projectTerminals.filter(t => t.isActive).length;

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={24} />,
      onClick: () => onViewChange('home')
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare size={24} />,
      onClick: () => onViewChange('chat')
    },
    {
      id: 'todos',
      label: 'Todos',
      icon: <CheckSquare size={24} />,
      badge: activeTodos,
      onClick: () => onViewChange('todos')
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: <TerminalIcon size={24} />,
      badge: activeTerminals,
      onClick: () => onViewChange('terminal')
    },
    {
      id: 'git',
      label: 'Git',
      icon: <GitBranch size={24} />,
      onClick: () => onViewChange('git')
    }
  ];

  if (!currentProject) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 safe-area-inset-bottom">
        <div className="flex items-center justify-center py-4">
          <p className="text-gray-400 text-sm">No project selected</p>
        </div>
      </div>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center min-w-[64px] py-1 px-2 rounded-lg transition-all ${
              currentView === item.id
                ? 'text-blue-400 bg-blue-900/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
        
        {/* Agents Status Indicator */}
        <button
          onClick={() => onViewChange('agents')}
          className={`flex flex-col items-center justify-center min-w-[64px] py-1 px-2 rounded-lg transition-all ${
            currentView === 'agents'
              ? 'text-blue-400 bg-blue-900/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          <div className="relative">
            <Cpu size={24} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs mt-1">Agents</span>
        </button>
      </div>

      {/* Project info bar */}
      <div className="px-4 py-1 bg-gray-800/50 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 truncate max-w-[150px]">
            {currentProject.name}
          </span>
          <span className="text-gray-500">
            {currentProject.type}
          </span>
        </div>
      </div>
    </nav>
  );
}
