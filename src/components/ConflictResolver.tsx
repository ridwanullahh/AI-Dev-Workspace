import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  X,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Conflict {
  filePath: string;
  currentVersion: string[];
  incomingVersion: string[];
  base: string[];
  resolved: boolean;
  resolution?: 'current' | 'incoming' | 'both' | 'custom';
  customResolution?: string[];
}

interface ConflictResolverProps {
  conflicts: Conflict[];
  onResolve: (filePath: string, resolution: string[]) => void;
  onAcceptAll: (strategy: 'current' | 'incoming') => void;
  onCancel: () => void;
}

export function ConflictResolver({ 
  conflicts, 
  onResolve, 
  onAcceptAll,
  onCancel 
}: ConflictResolverProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set([conflicts[0]?.filePath]));
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Set<string>>(new Set());

  const toggleExpanded = (filePath: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const handleAISuggestion = async (conflict: Conflict) => {
    setLoadingSuggestions(prev => new Set(prev).add(conflict.filePath));

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock AI suggestion - in real implementation, this would call AI service
      const suggestion = [
        ...conflict.base.slice(0, 2),
        '// AI-suggested merge',
        ...conflict.currentVersion.slice(0, 2),
        ...conflict.incomingVersion.slice(0, 2),
        ...conflict.base.slice(2)
      ];

      setAiSuggestions(prev => ({
        ...prev,
        [conflict.filePath]: suggestion
      }));
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    } finally {
      setLoadingSuggestions(prev => {
        const next = new Set(prev);
        next.delete(conflict.filePath);
        return next;
      });
    }
  };

  const resolvedCount = conflicts.filter(c => c.resolved).length;
  const unresolvedCount = conflicts.length - resolvedCount;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                Resolve Merge Conflicts
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {unresolvedCount} conflict{unresolvedCount !== 1 ? 's' : ''} remaining
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={unresolvedCount === 0 ? 'default' : 'destructive'}>
                {resolvedCount} / {conflicts.length} resolved
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcceptAll('current')}
            >
              Accept All Current
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcceptAll('incoming')}
            >
              Accept All Incoming
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Conflict List */}
        <div className="flex-1 overflow-y-auto">
          {conflicts.map((conflict, index) => (
            <div
              key={conflict.filePath}
              className={`border-b border-border ${
                conflict.resolved ? 'bg-green-500/5' : ''
              }`}
            >
              {/* File Header */}
              <div
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => toggleExpanded(conflict.filePath)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {expandedFiles.has(conflict.filePath) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    
                    <span className="font-mono text-sm">{conflict.filePath}</span>
                    
                    {conflict.resolved ? (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Conflict
                      </Badge>
                    )}
                  </div>

                  {!conflict.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAISuggestion(conflict);
                      }}
                      disabled={loadingSuggestions.has(conflict.filePath)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Suggestion
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Conflict Details */}
              {expandedFiles.has(conflict.filePath) && (
                <div className="p-6 bg-black/20 space-y-4">
                  {/* Current Version */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Current Changes (HEAD)</h4>
                      {!conflict.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResolve(conflict.filePath, conflict.currentVersion)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept Current
                        </Button>
                      )}
                    </div>
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 font-mono text-xs">
                      {conflict.currentVersion.map((line, idx) => (
                        <div key={idx} className="text-red-400">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Incoming Version */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Incoming Changes</h4>
                      {!conflict.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResolve(conflict.filePath, conflict.incomingVersion)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept Incoming
                        </Button>
                      )}
                    </div>
                    <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 font-mono text-xs">
                      {conflict.incomingVersion.map((line, idx) => (
                        <div key={idx} className="text-green-400">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Suggestion */}
                  {aiSuggestions[conflict.filePath] && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          AI Suggested Resolution
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResolve(conflict.filePath, aiSuggestions[conflict.filePath])}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept AI Suggestion
                        </Button>
                      </div>
                      <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 font-mono text-xs">
                        {aiSuggestions[conflict.filePath].map((line, idx) => (
                          <div key={idx} className="text-purple-400">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accept Both */}
                  {!conflict.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => onResolve(
                        conflict.filePath,
                        [...conflict.currentVersion, ...conflict.incomingVersion]
                      )}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Accept Both Changes
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Review and resolve all conflicts before continuing
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel Merge
              </Button>
              <Button disabled={unresolvedCount > 0}>
                <Check className="h-4 w-4 mr-2" />
                Complete Merge ({resolvedCount}/{conflicts.length})
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
