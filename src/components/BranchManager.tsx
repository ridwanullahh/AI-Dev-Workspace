import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  GitMerge,
  Check,
  X,
  Clock,
  RefreshCw,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Branch {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: Date;
  };
  ahead: number;
  behind: number;
}

interface BranchManagerProps {
  projectId: string;
  currentBranch: string;
  onBranchChange: (branchName: string) => Promise<void>;
}

export function BranchManager({ projectId, currentBranch, onBranchChange }: BranchManagerProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  useEffect(() => {
    loadBranches();
  }, [projectId]);

  const loadBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock data - in real implementation, this would use gitCore service
      const mockBranches: Branch[] = [
        {
          name: 'main',
          isRemote: false,
          isCurrent: true,
          lastCommit: {
            hash: 'abc123',
            message: 'Initial commit',
            author: 'John Doe',
            date: new Date()
          },
          ahead: 0,
          behind: 0
        },
        {
          name: 'develop',
          isRemote: false,
          isCurrent: false,
          lastCommit: {
            hash: 'def456',
            message: 'Add new feature',
            author: 'Jane Smith',
            date: new Date(Date.now() - 86400000)
          },
          ahead: 3,
          behind: 0
        },
        {
          name: 'feature/auth',
          isRemote: false,
          isCurrent: false,
          lastCommit: {
            hash: 'ghi789',
            message: 'Implement authentication',
            author: 'Bob Johnson',
            date: new Date(Date.now() - 172800000)
          },
          ahead: 5,
          behind: 2
        },
        {
          name: 'origin/main',
          isRemote: true,
          isCurrent: false,
          lastCommit: {
            hash: 'abc123',
            message: 'Initial commit',
            author: 'John Doe',
            date: new Date()
          },
          ahead: 0,
          behind: 0
        }
      ];

      setBranches(mockBranches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      setError('Branch name cannot be empty');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // In real implementation, this would call gitCore.createBranch()
      await new Promise(resolve => setTimeout(resolve, 500));

      setNewBranchName('');
      setShowCreateBranch(false);
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await onBranchChange(branchName);
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (!confirm(`Delete branch "${branchName}"?`)) return;

    try {
      setIsLoading(true);
      setError(null);

      // In real implementation, this would call gitCore.deleteBranch()
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeBranch = async (branchName: string) => {
    if (!confirm(`Merge "${branchName}" into "${currentBranch}"?`)) return;

    try {
      setIsLoading(true);
      setError(null);

      // In real implementation, this would call gitCore.mergeBranch()
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge branch');
    } finally {
      setIsLoading(false);
    }
  };

  const localBranches = branches.filter(b => !b.isRemote);
  const remoteBranches = branches.filter(b => b.isRemote);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Branch Manager
          </h2>
          <Button size="sm" onClick={() => setShowCreateBranch(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Branch
          </Button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-200">{error}</span>
          </div>
        )}
      </div>

      {/* Branch Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Local Branches */}
        <div className="mb-6">
          <div className="px-4 py-2 bg-muted/50 font-medium text-sm">
            Local Branches ({localBranches.length})
          </div>
          <div className="divide-y divide-border">
            {localBranches.map((branch) => (
              <div
                key={branch.name}
                className={`p-4 hover:bg-muted/50 transition-colors ${
                  branch.isCurrent ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <GitBranch className={`h-4 w-4 ${branch.isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`font-medium ${branch.isCurrent ? 'text-primary' : ''}`}>
                      {branch.name}
                    </span>
                    {branch.isCurrent && (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    )}
                  </div>

                  {!branch.isCurrent && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSwitchBranch(branch.name)}
                        disabled={isLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedBranch(branch)}
                      >
                        <GitMerge className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDeleteBranch(branch.name)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-2 truncate">
                  {branch.lastCommit.message}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{branch.lastCommit.author}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(branch.lastCommit.date).toLocaleDateString()}
                  </span>
                  {(branch.ahead > 0 || branch.behind > 0) && (
                    <>
                      {branch.ahead > 0 && (
                        <Badge variant="outline" className="text-green-500 text-xs">
                          ↑{branch.ahead}
                        </Badge>
                      )}
                      {branch.behind > 0 && (
                        <Badge variant="outline" className="text-red-500 text-xs">
                          ↓{branch.behind}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remote Branches */}
        {remoteBranches.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/50 font-medium text-sm">
              Remote Branches ({remoteBranches.length})
            </div>
            <div className="divide-y divide-border">
              {remoteBranches.map((branch) => (
                <div
                  key={branch.name}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">{branch.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {branch.lastCommit.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Branch Modal */}
      {showCreateBranch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Branch</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Branch Name</label>
                <Input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/new-feature"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateBranch();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use lowercase with hyphens or slashes
                </p>
              </div>

              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Branch from: {currentBranch}</p>
                <p className="text-xs text-muted-foreground">
                  New branch will be created from the current branch
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Branch
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateBranch(false);
                    setNewBranchName('');
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Confirmation Modal */}
      {selectedBranch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Merge Branch
            </h3>
            
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm mb-2">
                  <span className="text-muted-foreground">From:</span>{' '}
                  <span className="font-medium">{selectedBranch.name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Into:</span>{' '}
                  <span className="font-medium">{currentBranch}</span>
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                This will merge all commits from {selectedBranch.name} into {currentBranch}.
                Any conflicts will need to be resolved manually.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    handleMergeBranch(selectedBranch.name);
                    setSelectedBranch(null);
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <GitMerge className="h-4 w-4 mr-2" />
                      Merge
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedBranch(null)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
