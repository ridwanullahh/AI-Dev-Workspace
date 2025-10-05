import React, { useState, useEffect } from 'react';
import { db, type Commit } from '@/database/schema';
import {
  GitCommit,
  GitBranch,
  User,
  Calendar,
  FileText,
  ChevronRight,
  GitMerge,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CommitNode extends Commit {
  branches: string[];
  isMerge: boolean;
}

interface GitHistoryProps {
  projectId: string;
}

export function GitHistory({ projectId }: GitHistoryProps) {
  const [commits, setCommits] = useState<CommitNode[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<CommitNode | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCommits();
  }, [projectId]);

  const loadCommits = async () => {
    try {
      setIsLoading(true);
      
      // Get commits from database
      const dbCommits = await db.commits
        .where('projectId')
        .equals(projectId)
        .reverse()
        .sortBy('timestamp');

      // Transform to CommitNode with branch info
      const commitNodes: CommitNode[] = dbCommits.map(commit => ({
        ...commit,
        branches: [], // TODO: Implement branch detection
        isMerge: commit.parentHashes.length > 1
      }));

      setCommits(commitNodes);
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Commit List */}
      <div className="flex-1 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Commit History
            <Badge variant="outline" className="ml-2">
              {commits.length}
            </Badge>
          </h2>
        </div>

        {commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <GitCommit className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Commits Yet</h3>
            <p className="text-sm text-muted-foreground">
              Make your first commit to see history here
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Branch Graph Line */}
            <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-primary/30" />

            {commits.map((commit, index) => (
              <div
                key={commit.id}
                className={`relative p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border ${
                  selectedCommit?.id === commit.id ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedCommit(commit)}
              >
                {/* Graph Node */}
                <div className="absolute left-8 top-1/2 transform -translate-y-1/2">
                  {commit.isMerge ? (
                    <GitMerge className="h-5 w-5 text-purple-500 bg-background" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  )}
                </div>

                <div className="ml-12">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-1 truncate">
                        {commit.message}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{commit.author}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(commit.timestamp)}</span>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs font-mono"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyHash(commit.hash);
                      }}
                    >
                      {commit.hash.slice(0, 7)}
                      {copiedHash === commit.hash ? (
                        <Check className="h-3 w-3 ml-1" />
                      ) : (
                        <Copy className="h-3 w-3 ml-1" />
                      )}
                    </Button>

                    {commit.branches.map((branch) => (
                      <Badge key={branch} variant="outline" className="text-xs">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {branch}
                      </Badge>
                    ))}

                    {commit.isMerge && (
                      <Badge variant="secondary" className="text-xs">
                        Merge
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commit Details */}
      <div className="w-96 overflow-y-auto bg-card">
        {selectedCommit ? (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Commit Details</h3>
              <p className="text-sm">{selectedCommit.message}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Author:</span>
                <span className="font-medium">{selectedCommit.author}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {selectedCommit.timestamp.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <GitCommit className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hash:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 font-mono text-xs"
                  onClick={() => copyHash(selectedCommit.hash)}
                >
                  {selectedCommit.hash}
                  {copiedHash === selectedCommit.hash ? (
                    <Check className="h-3 w-3 ml-1" />
                  ) : (
                    <Copy className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Changed Files ({selectedCommit.files.length})
              </h4>
              
              <div className="space-y-1">
                {selectedCommit.files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No files changed</p>
                ) : (
                  selectedCommit.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-muted rounded text-sm font-mono hover:bg-muted/80 cursor-pointer transition-colors"
                    >
                      {file}
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedCommit.parentHashes.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Parent Commits</h4>
                <div className="space-y-1">
                  {selectedCommit.parentHashes.map((parent, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-muted rounded text-xs font-mono hover:bg-muted/80 cursor-pointer transition-colors"
                    >
                      {parent}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-2">
              <Button variant="outline" className="w-full" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Cherry-pick
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                View Diff
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                Revert
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <GitCommit className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Commit</h3>
            <p className="text-sm text-muted-foreground">
              Click on a commit to view its details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
