'use client';

import { useEffect, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useContractService } from '@/hooks/use-contract-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/components/theme-provider';
import { Crown, Zap, Rocket, Building2, AlertCircle, ChevronUp } from 'lucide-react';
import { CONTRACT_CONFIG } from '@/config/contracts';
import type { Subscription } from '@/types/contracts';

export function SubscriptionStatus() {
  const account = useCurrentAccount();
  const contractService = useContractService();
  const { theme } = useTheme();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [deploymentsRemaining, setDeploymentsRemaining] = useState(3);

  useEffect(() => {
    async function fetchSubscription() {
      if (!account) {
        setSubscription(null);
        setDeploymentsRemaining(CONTRACT_CONFIG.DEPLOYMENT_LIMITS.FREE);
        return;
      }

      setLoading(true);
      try {
        const sub = await contractService.subscription.getUserSubscription(account.address);
        setSubscription(sub);

        if (sub) {
          const limit = getDeploymentLimit(sub.tier);
          const used = Number(sub.deploymentsUsed);
          setDeploymentsRemaining(Math.max(0, limit - used));
        } else {
          setDeploymentsRemaining(CONTRACT_CONFIG.DEPLOYMENT_LIMITS.FREE);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [account, contractService]);

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case CONTRACT_CONFIG.TIERS.STARTER:
        return <Zap className="w-4 h-4" />;
      case CONTRACT_CONFIG.TIERS.GROWTH:
        return <Rocket className="w-4 h-4" />;
      case CONTRACT_CONFIG.TIERS.ENTERPRISE:
        return <Building2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTierName = (tier: number) => {
    switch (tier) {
      case CONTRACT_CONFIG.TIERS.FREE:
        return 'Free';
      case CONTRACT_CONFIG.TIERS.STARTER:
        return 'Starter';
      case CONTRACT_CONFIG.TIERS.GROWTH:
        return 'Growth';
      case CONTRACT_CONFIG.TIERS.ENTERPRISE:
        return 'Enterprise';
      default:
        return 'Free';
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case CONTRACT_CONFIG.TIERS.STARTER:
        return theme === 'neon' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-900';
      case CONTRACT_CONFIG.TIERS.GROWTH:
        return theme === 'neon' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-900';
      case CONTRACT_CONFIG.TIERS.ENTERPRISE:
        return theme === 'neon' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-900';
      default:
        return theme === 'neon' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-900';
    }
  };

  const getDeploymentLimit = (tier: number) => {
    switch (tier) {
      case CONTRACT_CONFIG.TIERS.FREE:
        return CONTRACT_CONFIG.DEPLOYMENT_LIMITS.FREE;
      case CONTRACT_CONFIG.TIERS.STARTER:
        return CONTRACT_CONFIG.DEPLOYMENT_LIMITS.STARTER;
      case CONTRACT_CONFIG.TIERS.GROWTH:
        return CONTRACT_CONFIG.DEPLOYMENT_LIMITS.GROWTH;
      case CONTRACT_CONFIG.TIERS.ENTERPRISE:
        return CONTRACT_CONFIG.DEPLOYMENT_LIMITS.ENTERPRISE;
      default:
        return CONTRACT_CONFIG.DEPLOYMENT_LIMITS.FREE;
    }
  };

  const currentTier = subscription?.tier || CONTRACT_CONFIG.TIERS.FREE;
  const deploymentLimit = getDeploymentLimit(currentTier);
  const deploymentsUsed = subscription ? Number(subscription.deploymentsUsed) : 0;
  const usagePercentage = deploymentLimit === Infinity ? 0 : (deploymentsUsed / deploymentLimit) * 100;

  if (!account) {
    return (
      <Card className={`${
        theme === 'brutal'
          ? 'brutal-border'
          : theme === 'neon'
          ? 'border-cyan-500/30'
          : ''
      }`}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect wallet to view subscription
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={`${
        theme === 'brutal'
          ? 'brutal-border'
          : theme === 'neon'
          ? 'border-cyan-500/30'
          : ''
      }`}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${
      theme === 'brutal'
        ? 'brutal-border'
        : theme === 'neon'
        ? 'border-cyan-500/30'
        : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          <Badge className={`${getTierColor(currentTier)} gap-1`}>
            {getTierIcon(currentTier)}
            {getTierName(currentTier)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deployments Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Deployments</span>
            <span className="font-medium">
              {deploymentsRemaining} remaining
            </span>
          </div>
          {deploymentLimit !== Infinity && (
            <Progress value={usagePercentage} className="h-2" />
          )}
          <p className="text-xs text-muted-foreground">
            {deploymentsUsed} of {deploymentLimit === Infinity ? 'Unlimited' : deploymentLimit} used this month
          </p>
        </div>

        {/* Expiration Date */}
        {subscription && subscription.endDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expires</span>
            <span className="font-medium">
              {new Date(Number(subscription.endDate)).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Auto-Renew Status */}
        {subscription && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Auto-renew</span>
            <Badge variant={subscription.autoRenew ? 'default' : 'secondary'}>
              {subscription.autoRenew ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        )}

        {/* Upgrade Button */}
        {currentTier !== CONTRACT_CONFIG.TIERS.ENTERPRISE && (
          <Button
            size="sm"
            className="w-full"
            variant={theme === 'brutal' ? 'default' : 'outline'}
          >
            <ChevronUp className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        )}

        {/* Low Deployments Warning */}
        {deploymentsRemaining <= 2 && deploymentsRemaining > 0 && (
          <div className={`p-2 rounded-md text-xs ${
            theme === 'neon'
              ? 'bg-yellow-500/10 text-yellow-400'
              : 'bg-yellow-50 text-yellow-900'
          }`}>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Only {deploymentsRemaining} deployments remaining</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Progress component if not already available
function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-muted rounded-full ${className}`}>
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}