/**
 * Subscription Manager Contract Service
 * Handles all interactions with the subscription_manager smart contract
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { CONTRACT_CONFIG } from '@/config/contracts';
import type { Subscription, PaymentRecord } from '@/types/contracts';

export class SubscriptionManagerService {
  private client: SuiClient;

  constructor(client: SuiClient) {
    this.client = client;
  }

  /**
   * Create or upgrade subscription
   */
  async subscribe(
    tier: number,
    autoRenew: boolean,
    payment: {
      coinObjectId: string;
      amount: bigint;
    },
    signer: string
  ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> {
    try {
      const tx = new Transaction();

      // Split the exact amount from the coin
      const [paymentCoin] = tx.splitCoins(tx.object(payment.coinObjectId), [
        tx.pure.u64(payment.amount)
      ]);

      // Call subscribe function
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.SUBSCRIPTION_MANAGER}::subscribe`,
        typeArguments: [CONTRACT_CONFIG.USDC_TYPE],
        arguments: [
          tx.object(CONTRACT_CONFIG.SUBSCRIPTION_REGISTRY),
          paymentCoin,
          tx.pure.u8(tier),
          tx.pure.bool(autoRenew),
          tx.object(CONTRACT_CONFIG.CLOCK)
        ]
      });

      // Set gas budget
      tx.setGasBudget(10000000); // 0.01 SUI

      return { success: true, transaction: tx };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription transaction'
      };
    }
  }

  /**
   * Renew existing subscription
   */
  async renewSubscription(
    payment: {
      coinObjectId: string;
      amount: bigint;
    },
    signer: string
  ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> {
    try {
      const tx = new Transaction();

      // Split the exact amount from the coin
      const [paymentCoin] = tx.splitCoins(tx.object(payment.coinObjectId), [
        tx.pure.u64(payment.amount)
      ]);

      // Call renew_subscription function
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.SUBSCRIPTION_MANAGER}::renew_subscription`,
        typeArguments: [CONTRACT_CONFIG.USDC_TYPE],
        arguments: [
          tx.object(CONTRACT_CONFIG.SUBSCRIPTION_REGISTRY),
          paymentCoin,
          tx.object(CONTRACT_CONFIG.CLOCK)
        ]
      });

      // Set gas budget
      tx.setGasBudget(10000000); // 0.01 SUI

      return { success: true, transaction: tx };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create renewal transaction'
      };
    }
  }

  /**
   * Upgrade subscription tier
   */
  async upgradeTier(
    newTier: number,
    payment: {
      coinObjectId: string;
      amount: bigint;
    },
    signer: string
  ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> {
    try {
      const tx = new Transaction();

      // Split the exact amount from the coin
      const [paymentCoin] = tx.splitCoins(tx.object(payment.coinObjectId), [
        tx.pure.u64(payment.amount)
      ]);

      // Call upgrade_tier function
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.SUBSCRIPTION_MANAGER}::upgrade_tier`,
        typeArguments: [CONTRACT_CONFIG.USDC_TYPE],
        arguments: [
          tx.object(CONTRACT_CONFIG.SUBSCRIPTION_REGISTRY),
          paymentCoin,
          tx.pure.u8(newTier),
          tx.object(CONTRACT_CONFIG.CLOCK)
        ]
      });

      // Set gas budget
      tx.setGasBudget(10000000); // 0.01 SUI

      return { success: true, transaction: tx };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create upgrade transaction'
      };
    }
  }

  /**
   * Cancel auto-renewal
   */
  async cancelSubscription(signer: string): Promise<{ success: boolean; error?: string; transaction?: Transaction }> {
    try {
      const tx = new Transaction();

      // Call cancel_subscription function
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.SUBSCRIPTION_MANAGER}::cancel_subscription`,
        arguments: [
          tx.object(CONTRACT_CONFIG.SUBSCRIPTION_REGISTRY)
        ]
      });

      // Set gas budget
      tx.setGasBudget(10000000); // 0.01 SUI

      return { success: true, transaction: tx };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription'
      };
    }
  }

  /**
   * Get user's subscription details
   */
  async getUserSubscription(userAddress: string): Promise<Subscription | null> {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.SUBSCRIPTION_MANAGER}::get_subscription`,
        arguments: [
          tx.object(CONTRACT_CONFIG.SUBSCRIPTION_REGISTRY),
          tx.pure.address(userAddress)
        ]
      });

      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: userAddress
      });

      if (result.results && result.results.length > 0) {
        const returnValues = result.results[0].returnValues;
        if (returnValues && returnValues.length > 0) {
          return this.parseSubscription(returnValues[0]);
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }

  /**
   * Check if user can deploy
   */
  async canDeploy(userAddress: string): Promise<boolean> {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.SUBSCRIPTION_MANAGER}::can_deploy`,
        arguments: [
          tx.object(CONTRACT_CONFIG.SUBSCRIPTION_REGISTRY),
          tx.pure.address(userAddress),
          tx.object(CONTRACT_CONFIG.CLOCK)
        ]
      });

      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: userAddress
      });

      if (result.results && result.results.length > 0) {
        const returnValues = result.results[0].returnValues;
        if (returnValues && returnValues.length > 0) {
          return Boolean(returnValues[0][0]);
        }
      }

      return true; // Default to true for free tier
    } catch (error) {
      console.error('Error checking deployment permission:', error);
      return true; // Default to true on error
    }
  }

  /**
   * Get remaining deployments for current period
   */
  async getRemainingDeployments(userAddress: string): Promise<number> {
    const subscription = await this.getUserSubscription(userAddress);

    if (!subscription) {
      // Free tier defaults
      return CONTRACT_CONFIG.DEPLOYMENT_LIMITS.FREE;
    }

    const limit = this.getDeploymentLimit(subscription.tier);
    const used = Number(subscription.deploymentsUsed);

    return Math.max(0, limit - used);
  }

  /**
   * Parse subscription from Move return values
   */
  private parseSubscription(data: any): Subscription {
    // This would need proper BCS deserialization in production
    return {
      user: data.user || '',
      tier: data.tier || 0,
      startDate: BigInt(data.start_date || 0),
      endDate: BigInt(data.end_date || 0),
      deploymentsUsed: BigInt(data.deployments_used || 0),
      bandwidthUsed: BigInt(data.bandwidth_used || 0),
      autoRenew: Boolean(data.auto_renew),
      paymentHistory: data.payment_history || [],
      totalSpent: BigInt(data.total_spent || 0)
    };
  }

  /**
   * Get deployment limit for a tier
   */
  private getDeploymentLimit(tier: number): number {
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
  }

  /**
   * Get tier name
   */
  getTierName(tier: number): string {
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
        return 'Unknown';
    }
  }

  /**
   * Get tier price in USDC
   */
  getTierPrice(tier: number): bigint {
    switch (tier) {
      case CONTRACT_CONFIG.TIERS.FREE:
        return BigInt(CONTRACT_CONFIG.TIER_PRICES.FREE);
      case CONTRACT_CONFIG.TIERS.STARTER:
        return BigInt(CONTRACT_CONFIG.TIER_PRICES.STARTER);
      case CONTRACT_CONFIG.TIERS.GROWTH:
        return BigInt(CONTRACT_CONFIG.TIER_PRICES.GROWTH);
      case CONTRACT_CONFIG.TIERS.ENTERPRISE:
        return BigInt(CONTRACT_CONFIG.TIER_PRICES.ENTERPRISE);
      default:
        return BigInt(0);
    }
  }

  /**
   * Format USDC amount for display
   */
  formatUSDC(amount: bigint): string {
    const dollars = Number(amount) / 1_000_000;
    return `$${dollars.toFixed(2)}`;
  }
}