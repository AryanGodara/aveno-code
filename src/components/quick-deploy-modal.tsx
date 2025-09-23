'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/components/theme-provider';
import { Github, Loader2, Check, ExternalLink } from 'lucide-react';

interface QuickDeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'connect' | 'select' | 'deploy' | 'success';

type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  full_name: string;
  private: boolean;
};

export function QuickDeployModal({ open, onOpenChange }: QuickDeployModalProps) {
  const [step, setStep] = useState<Step>('connect');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[] | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const { theme, mounted } = useTheme();

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('connect');
      setSelectedRepo(null);
      setIsDeploying(false);
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
      } catch (e) {
        if (!didCancel) {
          setGithubConnected(false);
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

  const handleDeploy = async () => {
    if (!selectedRepo) return;
    
    setIsDeploying(true);
    setStep('deploy');
    
    // Simulate deployment process
    setTimeout(() => {
      // Add deployment to table
      const addDeployment = (globalThis as any).addDeployment;
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

      case 'select':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold font-display mb-2">Select Repository</h3>
              <p className="text-muted-foreground font-sans">
                Choose a repository to deploy
              </p>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {loadingRepos && (
                <div className="text-center text-sm text-muted-foreground">Loading repositories…</div>
              )}
              {!loadingRepos && repos?.map((repo) => (
                <Card
                  key={repo.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedRepo === repo.full_name
                      ? theme === 'neon'
                        ? 'border-cyan-500 bg-cyan-500/10 neon-glow-cyan'
                        : theme === 'brutal'
                        ? 'brutal-border bg-green-500/20'
                        : 'border-primary bg-primary/10'
                      : theme === 'brutal'
                      ? 'hover:brutal-shadow hover:translate-x-1 hover:translate-y-1'
                      : 'hover:border-border'
                  }`}
                  onClick={() => setSelectedRepo(repo.full_name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium font-sans">{repo.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{repo.description ?? 'No description'}</p>
                      </div>
                      <div className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {repo.language ?? 'n/a'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!loadingRepos && githubConnected && (!repos || repos.length === 0) && (
                <div className="text-center text-sm text-muted-foreground">
                  No repositories found.
                </div>
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