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
import { Github, Loader2, Check, ExternalLink, Star, Lock, AlertCircle } from 'lucide-react';

interface QuickDeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'loading' | 'connect' | 'select' | 'deploy' | 'success' | 'error';

type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  full_name: string;
  private: boolean;
  stargazers_count?: number;
  updated_at?: string;
};

type DeploymentResult = {
  success: boolean;
  message: string;
  buildId: string;
  portalUrl: string;
  publicHost: string;
  publicUrl: string;
};

export function QuickDeployModal({ open, onOpenChange }: QuickDeployModalProps) {
  const [step, setStep] = useState<Step>('loading');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[] | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [filter, setFilter] = useState('');
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { theme } = useTheme();

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('loading');
      setSelectedRepo(null);
      setFilter('');
      setDeploymentResult(null);
      setDeploymentProgress(0);
      setErrorMessage(null);
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
      } catch {
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
    
    setStep('deploy');
    setDeploymentProgress(0);
    setErrorMessage(null);
    
    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setDeploymentProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
    
    try {
      const githubUrl = `https://github.com/${selectedRepo}`;
      const response = await fetch('https://api.avenox.xyz/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubUrl }),
      });
      
      const result: DeploymentResult = await response.json();
      
      clearInterval(progressInterval);
      setDeploymentProgress(100);
      
      if (result.success) {
        setDeploymentResult(result);
        
        // Add deployment to table
        const addDeployment = typeof window !== 'undefined' ? window.addDeployment : undefined;
        if (addDeployment) {
          addDeployment({
            name: selectedRepo,
            status: 'success' as const,
            url: result.publicUrl,
            repo: `github.com/${selectedRepo}`,
          });
        }
        
        setTimeout(() => setStep('success'), 500);
      } else {
        setErrorMessage(result.message || 'Deployment failed');
        setStep('error');
      }
    } catch (error) {
      clearInterval(progressInterval);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to deploy. Please try again.');
      setStep('error');
    }
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
                ? 'bg-sky-500 text-black'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Github className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold font-nohemi mb-2">Connect to GitHub</h3>
              <p className="text-muted-foreground font-switzer mb-6">
                Connect your GitHub account to deploy repositories
              </p>
              <Button onClick={handleGitHubConnect}>
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
                ? 'bg-sky-500 text-black'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-nohemi mb-2">Checking GitHub connection…</h3>
              <p className="text-muted-foreground font-switzer">
                Fetching your repositories
              </p>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold font-nohemi mb-2">Select Repository</h3>
              <p className="text-muted-foreground font-switzer">
                Choose a repository to deploy
              </p>
            </div>
            {/* Search */}
            <div className="mb-2">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search repositories"
                className={`w-full h-9 px-3 rounded-md border text-foreground placeholder:text-muted-foreground text-sm outline-none ${
                  theme === 'neon'
                    ? 'border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/60 bg-zinc-800 focus:bg-zinc-750'
                    : theme === 'brutal'
                    ? 'brutal-border focus:outline-none bg-zinc-800'
                    : 'bg-zinc-800 border-zinc-700 focus:border-zinc-600'
                }`}
              />
            </div>

            {/* List */}
            <div className={`space-y-1 max-h-96 overflow-y-auto border rounded-md p-1 scrollbar-hide ${
              theme === 'neon'
                ? 'bg-zinc-800/80 border-cyan-500/30'
                : theme === 'brutal'
                ? 'bg-zinc-800 brutal-border'
                : 'bg-zinc-800 border-zinc-700'
            }`}>
              {loadingRepos && (
                <div className="text-center text-sm text-muted-foreground">Loading repositories…</div>
              )}
              {!loadingRepos && filteredRepos.map((repo) => {
                const selected = selectedRepo === repo.full_name;
                const base = 'flex items-start justify-between px-3 py-3 rounded-md border transition text-sm gap-3';
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {repo.private && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                        <span className="font-mono truncate">{repo.full_name}</span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
                      {repo.language && (
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground/80 whitespace-nowrap">
                          {repo.language}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        {typeof repo.stargazers_count === 'number' && (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Star className="w-3.5 h-3.5" />
                            {repo.stargazers_count}
                          </span>
                        )}
                        {repo.updated_at && (
                          <span className="whitespace-nowrap">Updated {formatUpdated(repo.updated_at)}</span>
                        )}
                      </div>
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
              <h3 className="text-lg font-semibold font-nohemi mb-2">Deploying...</h3>
              <p className="text-muted-foreground font-switzer mb-4">
                Building and deploying {selectedRepo}
              </p>
              
              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    theme === 'neon' 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                      : theme === 'brutal'
                      ? 'bg-green-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${deploymentProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {deploymentProgress < 30 ? 'Cloning repository...' :
                 deploymentProgress < 60 ? 'Installing dependencies...' :
                 deploymentProgress < 90 ? 'Building application...' :
                 'Publishing...'}
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
              <h3 className="text-lg font-semibold font-nohemi mb-2">Deployed Successfully!</h3>
              <p className="text-muted-foreground font-switzer mb-4">
                {selectedRepo} has been deployed and is now live
              </p>
              
              {deploymentResult && (
                <div className={`rounded-lg p-4 mb-6 text-left space-y-2 ${
                  theme === 'neon'
                    ? 'bg-zinc-800/80 border border-cyan-500/30'
                    : theme === 'brutal'
                    ? 'bg-zinc-800 brutal-border'
                    : 'bg-zinc-800 border border-zinc-700'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Build ID:</span>
                    <span className="text-sm font-mono">{deploymentResult.buildId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Host:</span>
                    <span className="text-sm font-mono">{deploymentResult.publicHost}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">URL:</span>
                    <span className="text-sm font-mono text-blue-500 hover:underline cursor-pointer" 
                          onClick={() => window.open(deploymentResult.publicUrl, '_blank')}>
                      {deploymentResult.publicUrl}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.open(deploymentResult?.publicUrl || '#', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Site
                </Button>
                <Button onClick={() => handleOpenChange(false)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className={`inline-flex p-4 rounded-full ${
              theme === 'neon'
                ? 'bg-red-500/20 text-red-400'
                : theme === 'brutal'
                ? 'bg-red-500 text-black'
                : 'bg-red-100 text-red-600'
            }`}>
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold font-nohemi mb-2">Deployment Failed</h3>
              <p className="text-muted-foreground font-switzer mb-4">
                {errorMessage || 'Something went wrong during deployment'}
              </p>
              
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setStep('select')}
                >
                  Try Again
                </Button>
                <Button onClick={() => handleOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`sm:max-w-2xl max-w-[95vw] ${
        theme === 'brutal' 
          ? 'brutal-border brutal-shadow bg-zinc-900' 
          : theme === 'neon'
          ? 'border-cyan-500/50 bg-zinc-900/95 backdrop-blur-sm'
          : 'bg-zinc-900'
      }`}>
        <DialogHeader>
          <DialogTitle className="font-nohemi">Quick Deploy</DialogTitle>
          <DialogDescription className="font-switzer">
            Deploy your project in minutes
          </DialogDescription>
        </DialogHeader>
        
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}