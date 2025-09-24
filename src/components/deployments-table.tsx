'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/components/theme-provider';
import { Rocket, ExternalLink } from 'lucide-react';

interface Deployment {
  id: string;
  name: string;
  status: 'success' | 'pending' | 'failed';
  url?: string;
  createdAt: Date;
  repo: string;
}

declare global {
  interface Window {
    addDeployment?: (deployment: Omit<Deployment, 'id' | 'createdAt'>) => void;
  }
}

export function DeploymentsTable() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const { theme } = useTheme();

  // Function to add a new deployment (used by QuickDeployModal)
  const addDeployment = (deployment: Omit<Deployment, 'id' | 'createdAt'>) => {
    const newDeployment: Deployment = {
      ...deployment,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    };
    setDeployments(prev => [newDeployment, ...prev]);
  };

  // Expose addDeployment to parent component (typed on window)
  if (typeof window !== 'undefined') {
    window.addDeployment = addDeployment;
  }

  if (deployments.length === 0) {
    return (
      <Card className={`w-full h-full flex flex-col ${
        theme === 'brutal' 
          ? 'brutal-border brutal-shadow' 
          : theme === 'neon'
          ? 'border-cyan-500/50 bg-card/80 backdrop-blur-sm'
          : ''
      }`}>
        <CardHeader className="text-center pb-6">
          <div className={`inline-flex p-4 rounded-full mb-4 mx-auto ${
            theme === 'neon'
              ? 'bg-cyan-500/20 text-cyan-400'
              : theme === 'brutal'
              ? 'bg-sky-500 text-black'
              : 'bg-muted text-muted-foreground'
          }`}>
            <Rocket className="w-8 h-8" />
          </div>
          <CardTitle className="font-display text-xl">No deployments yet</CardTitle>
          <CardDescription className="font-sans">
            Get started by deploying your first project
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center flex items-center justify-center">
          <Button
            onClick={() => {
              // Simulate clicking Quick Deploy
              const event = new CustomEvent('openQuickDeploy');
              window.dispatchEvent(event);
            }}
            className={`${
              theme === 'neon'
                ? 'neon-glow-cyan hover:neon-glow-green bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold transition-all duration-300'
                : theme === 'brutal'
                ? 'brutal-shadow brutal-border bg-sky-500 text-black font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200'
                : ''
            } font-display`}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Deploy Your First Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: Deployment['status']) => {
    switch (status) {
      case 'success':
        return theme === 'neon' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-green-100 text-green-800';
      case 'pending':
        return theme === 'neon' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return theme === 'neon' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-red-100 text-red-800';
      default:
        return '';
    }
  };

  return (
    <Card className={`w-full h-full flex flex-col ${
      theme === 'brutal' 
        ? 'brutal-border brutal-shadow' 
        : theme === 'neon'
        ? 'border-cyan-500/50 bg-card/80 backdrop-blur-sm'
        : ''
    }`}>
      <CardHeader>
        <CardTitle className="font-display">Recent Deployments</CardTitle>
        <CardDescription className="font-sans">
          Monitor your deployment status
        </CardDescription>
      </CardHeader>
      <CardContent className="w-full flex-1 fbex flex-col">
        <div className="w-full flex-1 overflow-auto">
          <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-sans">Project</TableHead>
              <TableHead className="font-sans">Repository</TableHead>
              <TableHead className="font-sans">Status</TableHead>
              <TableHead className="font-sans">Deployed</TableHead>
              <TableHead className="font-sans">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell className="font-medium font-sans">{deployment.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {deployment.repo}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(deployment.status)}>
                    {deployment.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-sans text-sm text-muted-foreground">
                  {deployment.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {deployment.url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={deployment.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}