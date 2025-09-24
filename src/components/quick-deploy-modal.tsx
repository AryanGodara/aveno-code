'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { Github, Loader2, Check, ExternalLink, Star, Lock } from 'lucide-react';

interface QuickDeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'loading' | 'connect' | 'select' | 'deploy' | 'success';

type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  full_name: string;
  private: boolean;
};

export function QuickDeployModal({ open, onOpenChange }: QuickDeployModalProps) {
  const [step, setStep] = useState<Step>('loading');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[] | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [filter, setFilter] = useState('');
  const { theme } = useTheme();

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('loading');
      setSelectedRepo(null);
      setFilter('');
    }
    onOpenChange(newOpen);
  };

  const handleGitHubConnect = () => {
    const returnTo = window.location.pathname;
    window.location.href = `/api/github/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  // Detect if user is already connected (token cookie exists)
  useEffect(() => {
    if (!open) return;
    let didCancel = false;
    async function fetchRepos() {
      setStep('loading');
      setLoadingRepos(true);
      try {
        const res = await fetch('/api/github/repos');
        if (res.status === 401) {
          if (!didCancel) {
            setGithubConnected(false);
            setRepos(null);
            setStep('connect');
          }
          return;
        }
        if (!res.ok) throw new Error('Failed to load repos');
        const data: GitHubRepo[] = await res.json();
        if (!didCancel) {
          setGithubConnected(true);
          setRepos(data);
          setStep('select');
        }
      } catch (_err) {
        if (!didCancel) {
          setGithubConnected(false);
          setStep('connect');
        }
      } finally {
        if (!didCancel) setLoadingRepos(false);
      }
    }
    fetchRepos();
    return () => {
      didCancel = true;
    };
  }, [open]);

  const filteredRepos = useMemo(() => {
    if (!repos) return [] as GitHubRepo[];
    const q = filter.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) =>
      r.full_name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q)
    );
  }, [repos, filter]);

  const formatUpdated = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '';
    }
  };

  const handleDeploy = async () => {
    if (!selectedRepo) return;
    
    setIsDeploying(true);
    setStep('deploy');
    
    // Simulate deployment process
    setTimeout(() => {
      // Add deployment to table
      const addDeployment = typeof window !== 'undefined' ? window.addDeployment : undefined;
      const slug = selectedRepo.replace('/', '-');
      if (addDeployment) {
        addDeployment({
          name: selectedRepo,
          status: 'success' as const,
          url: `https://${slug}-aveno.vercel.app`,
          repo: `github.com/${selectedRepo}`,
        });
      }
      
      setStep('success');
      setIsDeploying(false);
    }, 3000);
  };

  const renderStep = () => {
    switch (step) {
      case 'connect':
        return (
          <div className="text-center space-y-6">
            <div className={`inline-flex p-4 rounded-full ${
              theme === 'neon'
                ? 'bg-cyan-500/20 text-cyan-400'
                : theme === 'brutal'
                ? 'bg-green-500 text-black'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Github className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold font-display mb-2">Connect to GitHub</h3>
              <p className="text-muted-foreground font-sans mb-6">
                Connect your GitHub account to deploy repositories
              </p>
              <Button
                onClick={handleGitHubConnect}
                className={`${
                  theme === 'neon'
                    ? 'neon-glow-cyan hover:neon-glow-green bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold transition-all duration-300'
                    : theme === 'brutal'
                    ? 'brutal-shadow brutal-border bg-green-500 text-black font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200'
                    : ''
                } font-display`}
              >
                <Github className="w-4 h-4 mr-2" />
                Connect GitHub
              </Button>
            </div>
          </div>
        );

      case 'loading':
        return (
          <div className="text-center space-y-6">
            <div className={`inline-flex p-4 rounded-full ${
              theme === 'neon'
                ? 'bg-cyan-500/20 text-cyan-400 neon-glow-cyan'
                : theme === 'brutal'
                ? 'bg-green-500 text-black'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold font-display mb-2">Checking GitHub connection…</h3>
              <p className="text-muted-foreground font-sans">
                Fetching your repositories
              </p>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold font-display mb-2">Select Repository</h3>
              <p className="text-muted-foreground font-sans">
                Choose a repository to deploy
              </p>
            </div>
            {/* Search */}
            <div className="mb-2">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search repositories"
                className={`w-full h-9 px-3 rounded-md border bg-background text-foreground placeholder:text-muted-foreground text-sm outline-none ${
                  theme === 'neon'
                    ? 'border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/60'
                    : theme === 'brutal'
                    ? 'brutal-border focus:outline-none'
                    : ''
                }`}
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-2 bg-card/50">
              {loadingRepos && (
                <div className="text-center text-sm text-muted-foreground">Loading repositories…</div>
              )}
              {!loadingRepos && filteredRepos.map((repo) => {
                const selected = selectedRepo === repo.full_name;
                const base = 'flex items-center justify-between px-3 py-2 rounded-md border transition text-sm';
                const neon = selected
                  ? 'border-cyan-500 bg-cyan-500/10 neon-glow-cyan'
                  : 'border-border hover:border-cyan-500/60 hover:bg-cyan-500/5';
                const brutal = selected
                  ? 'brutal-border bg-green-500/15 brutal-shadow translate-x-0.5 translate-y-0.5'
                  : 'border-2 border-black hover:translate-x-0.5 hover:translate-y-0.5 hover:brutal-shadow';
                const neutral = selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted';

                return (
                  <div
                    key={repo.id}
                    role="button"
                    tabIndex={0}
                    className={`${base} ${
                      theme === 'neon' ? neon : theme === 'brutal' ? brutal : neutral
                    }`}
                    onClick={() => setSelectedRepo(repo.full_name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedRepo(repo.full_name);
                    }}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        {repo.private && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="font-mono truncate">{repo.full_name}</span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      {repo.language && (
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground/80">
                          {repo.language}
                        </span>
                      )}
                      {typeof (repo as any).stargazers_count === 'number' && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />
                          {(repo as any).stargazers_count}
                        </span>
                      )}
                      {(repo as any).updated_at && (
                        <span>Updated {formatUpdated((repo as any).updated_at)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {!loadingRepos && githubConnected && filteredRepos.length === 0 && (
                <div className="text-center text-sm text-muted-foreground">No repositories found.</div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleDeploy}
                disabled={!selectedRepo}
                className={`${
                  theme === 'neon'
                    ? 'neon-glow-cyan hover:neon-glow-green bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold transition-all duration-300'
                    : theme === 'brutal'
                    ? 'brutal-shadow brutal-border bg-green-500 text-black font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200'
                    : ''
                } font-display`}
              >
                Deploy Selected
              </Button>
            </div>
          </div>
        );

      case 'deploy':
        return (
          <div className="text-center space-y-6">
            <div className={`inline-flex p-4 rounded-full ${
              theme === 'neon'
                ? 'bg-cyan-500/20 text-cyan-400 neon-glow-cyan'
                : theme === 'brutal'
                ? 'bg-green-500 text-black'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold font-display mb-2">Deploying...</h3>
              <p className="text-muted-foreground font-sans">
                Building and deploying {selectedRepo}
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className={`inline-flex p-4 rounded-full ${
              theme === 'neon'
                ? 'bg-green-500/20 text-green-400 neon-glow-green'
                : theme === 'brutal'
                ? 'bg-green-500 text-black'
                : 'bg-green-100 text-green-600'
            }`}>
              <Check className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold font-display mb-2">Deployed Successfully!</h3>
              <p className="text-muted-foreground font-sans mb-6">
                {selectedRepo} has been deployed and is now live
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://${selectedRepo}-aveno.vercel.app`, '_blank')}
                  className="font-sans"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Site
                </Button>
                <Button
                  onClick={() => handleOpenChange(false)}
                  className={`${
                    theme === 'neon'
                      ? 'neon-glow-cyan hover:neon-glow-green bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold transition-all duration-300'
                      : theme === 'brutal'
                      ? 'brutal-shadow brutal-border bg-green-500 text-black font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200'
                      : ''
                  } font-display`}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`sm:max-w-md ${
        theme === 'brutal' 
          ? 'brutal-border brutal-shadow' 
          : theme === 'neon'
          ? 'border-cyan-500/50 bg-card/95 backdrop-blur-sm'
          : ''
      }`}>
        <DialogHeader>
          <DialogTitle className="font-display">Quick Deploy</DialogTitle>
          <DialogDescription className="font-sans">
            Deploy your project in minutes
          </DialogDescription>
        </DialogHeader>
        
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}