/**
 * Main Contract Service
 * Unified interface for all smart contract interactions
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { DeploymentRegistryService } from './deployment-registry';
import { SubscriptionManagerService } from './subscription-manager';
import { PaymentProcessorService } from './payment-processor';
import { USDCService } from './usdc';
import type { DeploymentRequest, DeploymentResult, TransactionStatus } from '@/types/contracts';
import { CONTRACT_CONFIG } from '@/config/contracts';

export class ContractService {
  private client: SuiClient;
  public deployment: DeploymentRegistryService;
  public subscription: SubscriptionManagerService;
  public payment: PaymentProcessorService;
  public usdc: USDCService;

  constructor(client: SuiClient) {
    this.client = client;
    this.deployment = new DeploymentRegistryService(client);
    this.subscription = new SubscriptionManagerService(client);
    this.payment = new PaymentProcessorService(client);
    this.usdc = new USDCService(client);
  }

  /**
   * Main deployment flow with blockchain integration
   */
  async deployWithPayment(
    request: DeploymentRequest,
    userAddress: string,
    signAndExecute: (tx: Transaction) => Promise<{ digest: string }>
  ): Promise<DeploymentResult> {
    try {
      // 1. Check subscription status
      const canDeploy = await this.subscription.canDeploy(userAddress);
      if (!canDeploy) {
        return {
          success: false,
          deploymentId: '',
          error: 'Deployment limit exceeded. Please upgrade your subscription.',
          transactionDigest: ''
        };
      }

      // 2. Calculate payment amount
      const deploymentCost = this.deployment.calculateDeploymentCost(request.estimatedWal);

      // 3. Get USDC balance
      const usdcBalance = await this.usdc.getBalance(userAddress);
      if (!usdcBalance || usdcBalance.totalBalance < deploymentCost) {
        return {
          success: false,
          deploymentId: '',
          error: `Insufficient USDC balance. Required: ${this.payment.formatUSDC(deploymentCost)}`,
          transactionDigest: ''
        };
      }

      // 4. Get USDC coin objects
      const usdcCoins = await this.usdc.getCoins(userAddress);
      if (usdcCoins.length === 0) {
        return {
          success: false,
          deploymentId: '',
          error: 'No USDC coins found in wallet',
          transactionDigest: ''
        };
      }

      // 5. Create deployment transaction
      const deploymentResult = await this.deployment.requestDeployment(
        request,
        {
          coinObjectId: usdcCoins[0].objectId,
          amount: deploymentCost
        },
        userAddress
      );

      if (!deploymentResult.success || !deploymentResult.transaction) {
        return deploymentResult;
      }

      // 6. Sign and execute transaction
      const result = await signAndExecute(deploymentResult.transaction);

      // 7. Extract deployment ID from events
      const txDetails = await this.client.getTransactionBlock({
        digest: result.digest,
        options: {
          showEvents: true
        }
      });

      let deploymentId = '';
      if (txDetails.events) {
        for (const event of txDetails.events) {
          if (event.type.includes('DeploymentCreated')) {
            deploymentId = event.parsedJson?.deployment_id || '';
            break;
          }
        }
      }

      return {
        success: true,
        deploymentId,
        transactionDigest: result.digest,
        publicUrl: '' // Will be updated when deployment completes
      };
    } catch (error) {
      return {
        success: false,
        deploymentId: '',
        error: error instanceof Error ? error.message : 'Failed to deploy with payment',
        transactionDigest: ''
      };
    }
  }

  /**
   * Simple deployment with USDC transfer (no contract interaction)
   */
  async simpleDeployWithUSDC(
    deploymentData: {
      repoUrl: string;
      branch: string;
      commitHash: string;
      buildCommand: string;
      outputDir: string;
    },
    userAddress: string,
    signAndExecute: (tx: Transaction) => Promise<{ digest: string }>
  ): Promise<DeploymentResult> {
    try {
      // Check USDC balance
      const requiredAmount = BigInt(CONTRACT_CONFIG.MIN_PAYMENT_USDC); // 5 USDC minimum
      const usdcBalance = await this.usdc.getBalance(userAddress);

      if (!usdcBalance || usdcBalance.totalBalance < requiredAmount) {
        return {
          success: false,
          deploymentId: '',
          error: `Insufficient USDC balance. Required: ${this.payment.formatUSDC(requiredAmount)}`,
          transactionDigest: ''
        };
      }

      // Get USDC coins
      const usdcCoins = await this.usdc.getCoins(userAddress);
      if (usdcCoins.length === 0) {
        return {
          success: false,
          deploymentId: '',
          error: 'No USDC coins found in wallet',
          transactionDigest: ''
        };
      }

      // Create transfer transaction
      const tx = await this.payment.transferUSDCForDeployment(
        {
          coinObjectId: usdcCoins[0].objectId,
          amount: requiredAmount
        },
        deploymentData,
        userAddress
      );

      // Execute transaction
      const result = await signAndExecute(tx);

      return {
        success: true,
        deploymentId: result.digest, // Use digest as temporary ID
        transactionDigest: result.digest,
        publicUrl: ''
      };
    } catch (error) {
      return {
        success: false,
        deploymentId: '',
        error: error instanceof Error ? error.message : 'Failed to process USDC payment',
        transactionDigest: ''
      };
    }
  }

  /**
   * Track transaction status
   */
  async trackTransaction(digest: string): Promise<TransactionStatus> {
    try {
      const tx = await this.client.getTransactionBlock({
        digest,
        options: {
          showEffects: true
        }
      });

      if (tx.effects?.status.status === 'success') {
        return {
          status: 'success',
          message: 'Transaction completed successfully',
          digest
        };
      } else if (tx.effects?.status.status === 'failure') {
        return {
          status: 'failed',
          message: tx.effects.status.error || 'Transaction failed',
          digest,
          error: tx.effects.status.error
        };
      } else {
        return {
          status: 'processing',
          message: 'Transaction is being processed',
          digest
        };
      }
    } catch (error) {
      // If transaction not found, it might still be pending
      return {
        status: 'pending',
        message: 'Transaction pending confirmation',
        digest
      };
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    digest: string,
    maxRetries: number = 30,
    intervalMs: number = 2000
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const status = await this.trackTransaction(digest);

      if (status.status === 'success') {
        return true;
      }

      if (status.status === 'failed') {
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return false;
  }
}

// Export individual services for direct use
export { DeploymentRegistryService } from './deployment-registry';
export { SubscriptionManagerService } from './subscription-manager';
export { PaymentProcessorService } from './payment-processor';
export { USDCService } from './usdc';