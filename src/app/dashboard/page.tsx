'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DeploymentsTable } from '@/components/deployments-table';
import { QuickDeployModal } from '@/components/quick-deploy-modal';
import { useTheme } from '@/components/theme-provider';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  const [isQuickDeployOpen, setIsQuickDeployOpen] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const handleOpenQuickDeploy = () => {
      setIsQuickDeployOpen(true);
    };

    window.addEventListener('openQuickDeploy', handleOpenQuickDeploy);
    return () => window.removeEventListener('openQuickDeploy', handleOpenQuickDeploy);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 font-sans">
            Manage your deployments
          </p>
        </div>

        <Button
          onClick={() => setIsQuickDeployOpen(true)}
          className={`${
            theme === 'neon'
              ? 'neon-glow-cyan hover:neon-glow-green bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold transition-all duration-300'
              : theme === 'brutal'
              ? 'brutal-shadow brutal-border bg-sky-500 text-black font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200'
              : ''
          } font-display`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Quick Deploy
        </Button>
      </div>

      <div className="flex-1 flex flex-col">
        <DeploymentsTable />

        <QuickDeployModal
          open={isQuickDeployOpen}
          onOpenChange={setIsQuickDeployOpen}
        />
      </div>
    </div>
  );
}