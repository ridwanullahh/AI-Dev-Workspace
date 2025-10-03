import React, { useState, useEffect } from 'react';
import { githubAuth } from '@/services/githubAuth';
import { githubSync } from '@/services/githubSync';
import { Github, Search, Loader2, ExternalLink, Star, GitFork, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
}

interface GitHubRepoSelectorProps {
  onSelect: (repo: GitHubRepo) => void;
  selectedRepoId?: number;
  className?: string;
}

export function GitHubRepoSelector({ onSelect, selectedRepoId, className = '' }: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = repos.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredRepos(filtered);
      setCurrentPage(1);
    } else {
      setFilteredRepos(repos);
    }
  }, [searchQuery, repos]);

  const checkAuth = async () => {
    try {
      const isAuth = await githubAuth.isAuthenticated();
      setIsAuthenticated(isAuth);
      if (isAuth) {
        await loadRepos();
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
    }
  };

  const loadRepos = async () => {
    try {
      setIsLoading(true);
      const repositories = await githubSync.getRepositories();
      setRepos(repositories);
      setFilteredRepos(repositories);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const deviceFlow = await githubAuth.initiateDeviceFlow();

      const modal = window.open('', '_blank', 'width=500,height=600');
      if (modal) {
        modal.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>GitHub Authentication</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  padding: 40px;
                  text-align: center;
                  background: #0d1117;
                  color: #c9d1d9;
                }
                h1 {
                  color: #58a6ff;
                  margin-bottom: 20px;
                }
                a {
                  color: #58a6ff;
                  text-decoration: none;
                }
                a:hover {
                  text-decoration: underline;
                }
                .code {
                  font-size: 48px;
                  font-weight: bold;
                  margin: 40px 0;
                  letter-spacing: 8px;
                  color: #58a6ff;
                  font-family: monospace;
                }
                .note {
                  margin-top: 40px;
                  color: #8b949e;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <h1>🔗 Connect GitHub</h1>
              <p>Go to: <a href="${deviceFlow.verification_uri}" target="_blank">${deviceFlow.verification_uri}</a></p>
              <div class="code">${deviceFlow.user_code}</div>
              <p>Enter this code to authorize</p>
              <p class="note">This window will close automatically once you've authorized...</p>
            </body>
          </html>
        `);
      }

      await githubAuth.pollForAccessToken(deviceFlow.device_code, deviceFlow.interval);
      setIsAuthenticated(true);
      if (modal) modal.close();
      await loadRepos();
    } catch (error) {
      console.error('GitHub authentication failed:', error);
      alert('GitHub authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const paginatedRepos = filteredRepos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredRepos.length / itemsPerPage);

  if (!isAuthenticated) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Github className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Connect GitHub</h3>
        <p className="text-muted-foreground mb-6 text-sm">
          Connect your GitHub account to access your repositories
        </p>
        <Button onClick={handleConnect} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Github className="h-4 w-4 mr-2" />
              Connect GitHub
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search repositories..."
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Repository List */}
      {!isLoading && paginatedRepos.length > 0 && (
        <div className="space-y-2">
          {paginatedRepos.map((repo) => (
            <div
              key={repo.id}
              className={`bg-card rounded-lg p-4 border cursor-pointer transition-colors ${
                selectedRepoId === repo.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onSelect(repo)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {repo.private ? (
                      <Lock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <Unlock className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    <h4 className="font-semibold truncate">{repo.full_name}</h4>
                  </div>

                  {repo.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {repo.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language && (
                      <Badge variant="outline" className="text-xs">
                        {repo.language}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span>{repo.stargazers_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />
                      <span>{repo.forks_count}</span>
                    </div>
                    <span>Updated {formatDate(repo.updated_at)}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(repo.html_url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRepos.length === 0 && repos.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No repositories found matching your search.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadRepos} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Github className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
