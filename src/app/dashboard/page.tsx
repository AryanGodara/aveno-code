'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DeploymentsTable } from '@/components/deployments-table';
import { QuickDeployModalV2 } from '@/components/quick-deploy-modal-v2';
import { SubscriptionStatus } from '@/components/subscription-status';
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

      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <div className="md:col-span-3">
          {/* Stats cards can go here */}
        </div>
        <div className="md:col-span-1">
          <SubscriptionStatus />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <DeploymentsTable />

        <QuickDeployModalV2
          open={isQuickDeployOpen}
          onOpenChange={setIsQuickDeployOpen}
        />
      </div>
    </div>
  );
}