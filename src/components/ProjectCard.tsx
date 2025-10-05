import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/database/schema';
import {
  Folder,
  GitBranch,
  Github,
  Calendar,
  MoreVertical,
  Trash2,
  Settings,
  ExternalLink,
  Copy,
  Archive,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
  onSync: (project: Project) => void;
  onConnect: (project: Project) => void;
}

export function ProjectCard({ project, onDelete, onSync, onConnect }: ProjectCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web': return '🌐';
      case 'mobile': return '📱';
      case 'api': return '🖥️';
      case 'library': return '📦';
      default: return '📁';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'archived': return 'text-gray-500 bg-gray-500/10';
      case 'template': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const handleOpen = () => {
    navigate(`/project/${project.id}`);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(project.id);
  };

  return (
    <div className="group bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-200 overflow-hidden hover:shadow-lg">
      {/* Thumbnail */}
      <div
        className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center cursor-pointer"
        onClick={handleOpen}
      >
        {!imageError ? (
          <div className="text-6xl">{getTypeIcon(project.type)}</div>
        ) : (
          <div className="text-6xl">{getTypeIcon(project.type)}</div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={handleOpen}>
            <h3 className="font-semibold truncate mb-1 group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {project.description || 'No description'}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpen}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyId}>
                <Copy className="h-4 w-4 mr-2" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/project/${project.id}?tab=settings`)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            {project.type}
          </Badge>
          <Badge variant="outline" className={`text-xs ${getStatusColor(project.status)}`}>
            {project.status}
          </Badge>
          {project.gitConfig?.isConnected && (
            <Badge variant="outline" className="text-xs">
              <Github className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
          {project.metadata?.framework && (
            <Badge variant="outline" className="text-xs">
              {project.metadata.framework}
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
          {project.gitConfig?.branch && (
            <div className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              <span>{project.gitConfig.branch}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleOpen}
          >
            <Folder className="h-4 w-4 mr-2" />
            Open
          </Button>
          
          {project.gitConfig?.isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSync(project)}
            >
              <GitBranch className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConnect(project)}
            >
              <Github className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Git Status */}
        {project.gitConfig?.isConnected && project.gitConfig.lastSync && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Last synced</span>
              <span className="text-green-500 font-medium">
                {new Date(project.gitConfig.lastSync).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
