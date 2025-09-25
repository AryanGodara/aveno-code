'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DeploymentsTable } from '@/components/deployments-table';
import { QuickDeployModal } from '@/components/quick-deploy-modal';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  const [isQuickDeployOpen, setIsQuickDeployOpen] = useState(false);

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
          <h1 className="text-3xl font-nohemi text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 font-switzer">
            Manage your deployments
          </p>
        </div>

        <Button onClick={() => setIsQuickDeployOpen(true)}>
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