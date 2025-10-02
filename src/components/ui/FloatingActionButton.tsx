import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, Code, Settings, Zap } from 'lucide-react';

interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  mainIcon?: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions,
  mainIcon = <Plus className="w-6 h-6" />,
  position = 'bottom-right',
  size = 'md',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setIsOpen(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16'
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2'
  };

  const handleMainClick = () => {
    if (actions.length === 1) {
      actions[0].onClick();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div 
      className={`
        fixed z-50 transition-all duration-300
        ${positionClasses[position]}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}
        ${className}
      `}
    >
      {/* Action Items */}
      {actions.length > 1 && isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col-reverse items-end space-y-reverse space-y-3 mb-2">
          {actions.map((action, index) => (
            <div
              key={action.id}
              className={`
                flex items-center space-x-3 transition-all duration-300 ease-out
                transform ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
              `}
              style={{ 
                transitionDelay: `${index * 50}ms` 
              }}
            >
              {/* Action Label */}
              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap">
                {action.label}
              </div>
              
              {/* Action Button */}
              <button
                onClick={() => handleActionClick(action)}
                className={`
                  w-12 h-12 rounded-full shadow-lg
                  flex items-center justify-center
                  transition-all duration-200
                  hover:scale-110 active:scale-95
                  ${action.color || 'bg-blue-500 hover:bg-blue-600'}
                  text-white
                `}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={handleMainClick}
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-r from-blue-500 to-purple-600
          hover:from-blue-600 hover:to-purple-700
          text-white rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-200
          hover:scale-110 active:scale-95
          ${isOpen ? 'rotate-45' : 'rotate-0'}
        `}
      >
        {mainIcon}
      </button>

      {/* Backdrop for closing */}
      {isOpen && actions.length > 1 && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Preset FAB configurations
export const ChatFAB: React.FC<{ onNewChat: () => void; onSettings: () => void; onCode: () => void }> = ({
  onNewChat,
  onSettings,
  onCode
}) => {
  const actions: FABAction[] = [
    {
      id: 'new-chat',
      icon: <MessageCircle className="w-5 h-5" />,
      label: 'New Chat',
      onClick: onNewChat,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'code-editor',
      icon: <Code className="w-5 h-5" />,
      label: 'Code Editor',
      onClick: onCode,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'settings',
      icon: <Settings className="w-5 h-5" />,
      label: 'Settings',
      onClick: onSettings,
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ];

  return <FloatingActionButton actions={actions} />;
};

export const QuickActionFAB: React.FC<{ 
  onQuickAction: () => void;
  icon?: React.ReactNode;
  label?: string;
}> = ({ 
  onQuickAction, 
  icon = <Zap className="w-6 h-6" />,
  label = 'Quick Action'
}) => {
  const actions: FABAction[] = [
    {
      id: 'quick-action',
      icon,
      label,
      onClick: onQuickAction
    }
  ];

  return <FloatingActionButton actions={actions} mainIcon={icon} />;
};