import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  Minus, 
  FileText, 
  Check, 
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  staged: boolean;
  additions: number;
  deletions: number;
  hunks?: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }>;
}

interface GitStagingAreaProps {
  projectId: string;
  onCommit: (message: string, files: string[]) => Promise<void>;
}

export function GitStagingArea({ projectId, onCommit }: GitStagingAreaProps) {
  const [files, setFiles] = useState<FileChange[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null);

  useEffect(() => {
    loadChanges();
  }, [projectId]);

  const loadChanges = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock data - in real implementation, this would use gitCore service
      const mockChanges: FileChange[] = [
        {
          path: 'src/components/ChatPage.tsx',
          status: 'modified',
          staged: false,
          additions: 42,
          deletions: 12,
          hunks: [
            {
              oldStart: 10,
              oldLines: 5,
              newStart: 10,
              newLines: 8,
              lines: [
                ' import React from "react"',
                '+import { useChatStore } from "@/stores/chatStore"',
                '+import { Button } from "@/components/ui/button"',
                ' ',
                ' export function ChatPage() {'
              ]
            }
          ]
        },
        {
          path: 'src/stores/chatStore.ts',
          status: 'modified',
          staged: true,
          additions: 28,
          deletions: 5
        },
        {
          path: 'src/components/NewComponent.tsx',
          status: 'added',
          staged: false,
          additions: 150,
          deletions: 0
        }
      ];

      setFiles(mockChanges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load changes');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFileStaged = (path: string) => {
    setFiles(files.map(f => 
      f.path === path ? { ...f, staged: !f.staged } : f
    ));
  };

  const stageAll = () => {
    setFiles(files.map(f => ({ ...f, staged: true })));
  };

  const unstageAll = () => {
    setFiles(files.map(f => ({ ...f, staged: false })));
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }

    const stagedFiles = files.filter(f => f.staged);
    if (stagedFiles.length === 0) {
      setError('No files staged for commit');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await onCommit(commitMessage, stagedFiles.map(f => f.path));
      
      setCommitMessage('');
      await loadChanges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added': return 'text-green-500';
      case 'modified': return 'text-yellow-500';
      case 'deleted': return 'text-red-500';
      case 'renamed': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return <Plus className="h-4 w-4" />;
      case 'modified': return <FileText className="h-4 w-4" />;
      case 'deleted': return <Minus className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const stagedFiles = files.filter(f => f.staged);
  const unstagedFiles = files.filter(f => !f.staged);

  if (isLoading && files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Staging Area
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={stageAll} disabled={unstagedFiles.length === 0}>
              Stage All
            </Button>
            <Button size="sm" variant="outline" onClick={unstageAll} disabled={stagedFiles.length === 0}>
              Unstage All
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-200">{error}</span>
          </div>
        )}
      </div>

      {/* File Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        {stagedFiles.length > 0 && (
          <div className="mb-4">
            <div className="px-4 py-2 bg-muted/50 font-medium text-sm flex items-center justify-between">
              <span>Staged Changes ({stagedFiles.length})</span>
              <Badge variant="outline">Ready to commit</Badge>
            </div>
            <div className="divide-y divide-border">
              {stagedFiles.map((file) => (
                <div
                  key={file.path}
                  className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={file.staged}
                      onCheckedChange={() => toggleFileStaged(file.path)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className={`flex-shrink-0 ${getStatusColor(file.status)}`}>
                      {getStatusIcon(file.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.path}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(file.status)}`}>
                          {file.status}
                        </Badge>
                        <span className="text-green-500">+{file.additions}</span>
                        <span className="text-red-500">-{file.deletions}</span>
                      </div>
                    </div>

                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unstaged Changes */}
        {unstagedFiles.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/50 font-medium text-sm">
              Unstaged Changes ({unstagedFiles.length})
            </div>
            <div className="divide-y divide-border">
              {unstagedFiles.map((file) => (
                <div
                  key={file.path}
                  className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={file.staged}
                      onCheckedChange={() => toggleFileStaged(file.path)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className={`flex-shrink-0 ${getStatusColor(file.status)}`}>
                      {getStatusIcon(file.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.path}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(file.status)}`}>
                          {file.status}
                        </Badge>
                        <span className="text-green-500">+{file.additions}</span>
                        <span className="text-red-500">-{file.deletions}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <GitBranch className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Changes</h3>
            <p className="text-sm text-muted-foreground">
              Your working directory is clean
            </p>
          </div>
        )}
      </div>

      {/* Commit Section */}
      {stagedFiles.length > 0 && (
        <div className="p-4 border-t border-border flex-shrink-0 space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Commit Message</label>
            <Textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Commit {stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Diff Viewer (if file selected) */}
      {selectedFile && selectedFile.hunks && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">{selectedFile.path}</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              {selectedFile.hunks.map((hunk, idx) => (
                <div key={idx} className="mb-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                  </div>
                  {hunk.lines.map((line, lineIdx) => (
                    <div
                      key={lineIdx}
                      className={`${
                        line.startsWith('+')
                          ? 'bg-green-500/10 text-green-500'
                          : line.startsWith('-')
                          ? 'bg-red-500/10 text-red-500'
                          : ''
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
