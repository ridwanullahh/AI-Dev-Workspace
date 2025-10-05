import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { githubAuth } from '../services/githubAuth';
import { useDebounce } from '@/hooks/useDebounce';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
}

interface GitHubRepoSelectorProps {
  onSelectRepo: (repo: Repo) => void;
}

export function GitHubRepoSelector({ onSelectRepo }: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { repos: fetchedRepos, hasNextPage: newHasNextPage } = await githubAuth.getRepositories(page);
        setRepos(fetchedRepos);
        setHasNextPage(newHasNextPage);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepos();
  }, [page, debouncedSearchQuery]);

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search repositories..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {isLoading && <p>Loading repositories...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && (
        <>
          <ul className="space-y-2">
            {filteredRepos.map(repo => (
              <li key={repo.id} className="p-2 border rounded-md hover:bg-muted">
                <button onClick={() => onSelectRepo(repo)} className="w-full text-left">
                  <p className="font-semibold">{repo.name}</p>
                  <p className="text-sm text-muted-foreground">{repo.description}</p>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-between">
            <Button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              Previous
            </Button>
            <Button onClick={() => setPage(p => p + 1)} disabled={!hasNextPage}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}