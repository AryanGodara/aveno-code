'use client';

import { useState, useEffect } from 'react';
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
import { 
  Deployment, 
  getDeployments, 
  addDeployment as addDeploymentToStorage 
} from '@/lib/deployment-storage';

declare global {
  interface Window {
    addDeployment?: (deployment: Omit<Deployment, 'id' | 'createdAt'>) => void;
  }
}

export function DeploymentsTable() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const { theme } = useTheme();

  // Load deployments from localStorage on component mount
  useEffect(() => {
    const storedDeployments = getDeployments();
    setDeployments(storedDeployments);
  }, []);

  // Function to add a new deployment (used by QuickDeployModal)
  const addDeployment = (deployment: Omit<Deployment, 'id' | 'createdAt'>) => {
    const newDeployment = addDeploymentToStorage(deployment);
    setDeployments(prev => [newDeployment, ...prev]);
  };

  // Expose addDeployment to parent component (typed on window)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addDeployment = addDeployment;
    }
  }, []);

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
          <CardTitle className="font-nohemi text-xl">No deployments yet</CardTitle>
          <CardDescription className="font-switzer">
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
        <CardTitle className="font-nohemi">Recent Deployments</CardTitle>
        <CardDescription className="font-switzer">
          Monitor your deployment status
        </CardDescription>
      </CardHeader>
      <CardContent className="w-full flex-1 fbex flex-col">
        <div className="w-full flex-1 overflow-auto">
          <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-switzer">Project</TableHead>
              <TableHead className="font-switzer">Repository</TableHead>
              <TableHead className="font-switzer">Status</TableHead>
              <TableHead className="font-switzer">Deployed</TableHead>
              <TableHead className="font-switzer">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell className="font-medium font-switzer">{deployment.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {deployment.repo}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(deployment.status)}>
                    {deployment.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-switzer text-sm text-muted-foreground">
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