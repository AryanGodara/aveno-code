/**
 * Deployment Registry Contract Service
 * Handles all interactions with the deployment_registry smart contract
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { CONTRACT_CONFIG } from '@/config/contracts';
import type { DeploymentRecord, DeploymentRequest, DeploymentResult } from '@/types/contracts';

export class DeploymentRegistryService {
  private client: SuiClient;

  constructor(client: SuiClient) {
    this.client = client;
  }

  /**
   * Request a new deployment on-chain
   */
  async requestDeployment(
    request: DeploymentRequest,
    payment: {
      coinObjectId: string;
      amount: bigint;
    },
    signer: string
  ): Promise<DeploymentResult> {
    try {
      const tx = new Transaction();

      // Split the exact amount from the coin
      const [paymentCoin] = tx.splitCoins(tx.object(payment.coinObjectId), [
        tx.pure.u64(payment.amount)
      ]);

      // Call request_deployment function
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.DEPLOYMENT_REGISTRY}::request_deployment`,
        typeArguments: [CONTRACT_CONFIG.USDC_TYPE],
        arguments: [
          tx.object(CONTRACT_CONFIG.DEPLOYMENT_REGISTRY),
          paymentCoin,
          tx.pure.string(request.repoUrl),
          tx.pure.string(request.branch),
          tx.pure.string(request.commitHash),
          tx.pure.string(request.buildCommand),
          tx.pure.string(request.outputDir),
          tx.pure.u64(request.estimatedWal),
          tx.pure.string(request.environment),
          tx.object(CONTRACT_CONFIG.CLOCK)
        ]
      });

      // Set gas budget
      tx.setGasBudget(10000000); // 0.01 SUI

      return {
        success: true,
        deploymentId: '', // Will be extracted from events
        transactionDigest: '',
        transaction: tx
      } as any;
    } catch (error) {
      return {
        success: false,
        deploymentId: '',
        error: error instanceof Error ? error.message : 'Failed to create deployment transaction',
        transactionDigest: ''
      };
    }
  }

  /**
   * Get deployment information
   */
  async getDeploymentInfo(deploymentId: string): Promise<DeploymentRecord | null> {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.DEPLOYMENT_REGISTRY}::get_deployment_info`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DEPLOYMENT_REGISTRY),
          tx.pure.id(deploymentId)
        ]
      });

      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000'
      });

      if (result.results && result.results.length > 0) {
        const returnValues = result.results[0].returnValues;
        if (returnValues && returnValues.length > 0) {
          return this.parseDeploymentRecord(returnValues[0]);
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching deployment info:', error);
      return null;
    }
  }

  /**
   * Get user's deployments
   */
  async getUserDeployments(userAddress: string): Promise<string[]> {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.DEPLOYMENT_REGISTRY}::get_user_deployments`,
        arguments: [
          tx.object(CONTRACT_CONFIG.DEPLOYMENT_REGISTRY),
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
          return this.parseDeploymentIds(returnValues[0]);
        }
      }

      return [];
    } catch (error) {
      console.error('Error fetching user deployments:', error);
      return [];
    }
  }

  /**
   * Request a rollback deployment
   */
  async requestRollbackDeployment(
    parentDeploymentId: string,
    payment: {
      coinObjectId: string;
      amount: bigint;
    },
    signer: string
  ): Promise<DeploymentResult> {
    try {
      const tx = new Transaction();

      // Split the exact amount from the coin
      const [paymentCoin] = tx.splitCoins(tx.object(payment.coinObjectId), [
        tx.pure.u64(payment.amount)
      ]);

      // Call request_rollback_deployment function
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.DEPLOYMENT_REGISTRY}::request_rollback_deployment`,
        typeArguments: [CONTRACT_CONFIG.USDC_TYPE],
        arguments: [
          tx.object(CONTRACT_CONFIG.DEPLOYMENT_REGISTRY),
          paymentCoin,
          tx.pure.id(parentDeploymentId),
          tx.object(CONTRACT_CONFIG.CLOCK)
        ]
      });

      // Set gas budget
      tx.setGasBudget(10000000); // 0.01 SUI

      return {
        success: true,
        deploymentId: '', // Will be extracted from events
        transactionDigest: '',
        transaction: tx
      } as any;
    } catch (error) {
      return {
        success: false,
        deploymentId: '',
        error: error instanceof Error ? error.message : 'Failed to create rollback transaction',
        transactionDigest: ''
      };
    }
  }

  /**
   * Parse deployment record from Move return values
   */
  private parseDeploymentRecord(data: any): DeploymentRecord {
    // This would need proper BCS deserialization in production
    // For now, returning a mock structure
    return {
      deploymentId: data.deployment_id || '',
      user: data.user || '',
      repoUrl: data.repo_url || '',
      commitHash: data.commit_hash || '',
      branch: data.branch || '',
      walrusSiteId: data.walrus_site_id || '',
      usdcPaid: BigInt(data.usdc_paid || 0),
      estimatedWal: BigInt(data.estimated_wal || 0),
      actualWalUsed: BigInt(data.actual_wal_used || 0),
      createdAt: BigInt(data.created_at || 0),
      deployedAt: BigInt(data.deployed_at || 0),
      status: data.status || 0,
      buildCommand: data.build_command || '',
      outputDir: data.output_dir || '',
      version: BigInt(data.version || 0),
      errorMessage: data.error_message || '',
      environment: data.environment || '',
      deploymentType: data.deployment_type || 0,
      parentDeploymentId: data.parent_deployment_id,
      metadata: data.metadata || ''
    };
  }

  /**
   * Parse deployment IDs from return values
   */
  private parseDeploymentIds(data: any): string[] {
    // This would need proper BCS deserialization in production
    if (Array.isArray(data)) {
      return data.map(id => String(id));
    }
    return [];
  }

  /**
   * Monitor deployment status
   */
  async monitorDeploymentStatus(
    deploymentId: string,
    callback: (status: number) => void,
    maxRetries: number = 60,
    intervalMs: number = 5000
  ): Promise<void> {
    let retries = 0;

    const checkStatus = async () => {
      if (retries >= maxRetries) {
        callback(CONTRACT_CONFIG.STATUS.FAILED);
        return;
      }

      const deployment = await this.getDeploymentInfo(deploymentId);
      if (deployment) {
        callback(deployment.status);

        // Stop monitoring if deployment is completed or failed
        if (deployment.status === CONTRACT_CONFIG.STATUS.DEPLOYED ||
            deployment.status === CONTRACT_CONFIG.STATUS.FAILED) {
          return;
        }
      }

      retries++;
      setTimeout(checkStatus, intervalMs);
    };

    checkStatus();
  }

  /**
   * Calculate estimated deployment cost
   */
  calculateDeploymentCost(estimatedWal: bigint): bigint {
    // Base cost: 5 USDC minimum
    const baseCost = BigInt(CONTRACT_CONFIG.MIN_PAYMENT_USDC);

    // Add cost based on estimated WAL usage
    // Assuming 1 WAL = 0.01 USDC for calculation
    const walCost = (estimatedWal * BigInt(10000)) / BigInt(1000000);

    return baseCost + walCost;
  }
}