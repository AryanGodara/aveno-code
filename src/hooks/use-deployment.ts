/**
 * React hook for deployment operations
 */

import { useState, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useContractService } from './use-contract-service';
import type { DeploymentRequest, DeploymentResult, TransactionStatus } from '@/types/contracts';

export interface DeploymentState {
  isDeploying: boolean;
  deploymentStatus: 'idle' | 'checking' | 'signing' | 'processing' | 'confirming' | 'success' | 'failed';
  transactionDigest?: string;
  deploymentId?: string;
  error?: string;
  usdcBalance?: string;
  requiredUSDC?: string;
}

export function useDeployment() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const contractService = useContractService();

  const [state, setState] = useState<DeploymentState>({
    isDeploying: false,
    deploymentStatus: 'idle'
  });

  /**
   * Deploy with on-chain payment and metadata storage
   */
  const deployWithContract = useCallback(async (request: DeploymentRequest): Promise<DeploymentResult> => {
    if (!account) {
      setState(prev => ({
        ...prev,
        error: 'Please connect your wallet first'
      }));
      return {
        success: false,
        deploymentId: '',
        error: 'Wallet not connected',
        transactionDigest: ''
      };
    }

    setState({
      isDeploying: true,
      deploymentStatus: 'checking',
      error: undefined
    });

    try {
      // Check USDC balance
      const requiredAmount = contractService.deployment.calculateDeploymentCost(request.estimatedWal);
      const usdcBalance = await contractService.usdc.getBalance(account.address);

      setState(prev => ({
        ...prev,
        deploymentStatus: 'checking',
        requiredUSDC: contractService.payment.formatUSDC(requiredAmount),
        usdcBalance: usdcBalance ? contractService.usdc.formatUSDC(usdcBalance.totalBalance) : '$0.00'
      }));

      if (!usdcBalance || BigInt(usdcBalance.totalBalance) < requiredAmount) {
        const error = `Insufficient USDC. Required: ${contractService.payment.formatUSDC(requiredAmount)}`;
        setState(prev => ({
          ...prev,
          isDeploying: false,
          deploymentStatus: 'failed',
          error
        }));
        return {
          success: false,
          deploymentId: '',
          error,
          transactionDigest: ''
        };
      }

      setState(prev => ({
        ...prev,
        deploymentStatus: 'signing'
      }));

      // Deploy with payment
      const result = await contractService.deployWithPayment(
        request,
        account.address,
        async (tx) => {
          const { digest } = await signAndExecute(
            {
              transaction: tx,
              chain: 'sui:testnet'
            },
            {
              onSuccess: () => {
                setState(prev => ({
                  ...prev,
                  deploymentStatus: 'processing'
                }));
              }
            }
          );
          return { digest };
        }
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          deploymentStatus: 'confirming',
          transactionDigest: result.transactionDigest,
          deploymentId: result.deploymentId
        }));

        // Wait for confirmation
        const confirmed = await contractService.waitForTransaction(result.transactionDigest);

        setState(prev => ({
          ...prev,
          isDeploying: false,
          deploymentStatus: confirmed ? 'success' : 'failed',
          error: confirmed ? undefined : 'Transaction failed to confirm'
        }));
      } else {
        setState(prev => ({
          ...prev,
          isDeploying: false,
          deploymentStatus: 'failed',
          error: result.error
        }));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      setState(prev => ({
        ...prev,
        isDeploying: false,
        deploymentStatus: 'failed',
        error: errorMessage
      }));
      return {
        success: false,
        deploymentId: '',
        error: errorMessage,
        transactionDigest: ''
      };
    }
  }, [account, contractService, signAndExecute]);

  /**
   * Simple deployment with USDC transfer
   */
  const deployWithUSDC = useCallback(async (
    deploymentData: {
      repoUrl: string;
      branch: string;
      commitHash: string;
      buildCommand: string;
      outputDir: string;
    }
  ): Promise<DeploymentResult> => {
    if (!account) {
      setState(prev => ({
        ...prev,
        error: 'Please connect your wallet first'
      }));
      return {
        success: false,
        deploymentId: '',
        error: 'Wallet not connected',
        transactionDigest: ''
      };
    }

    setState({
      isDeploying: true,
      deploymentStatus: 'checking',
      error: undefined
    });

    try {
      setState(prev => ({
        ...prev,
        deploymentStatus: 'signing'
      }));

      const result = await contractService.simpleDeployWithUSDC(
        deploymentData,
        account.address,
        async (tx) => {
          const { digest } = await signAndExecute(
            {
              transaction: tx,
              chain: 'sui:testnet'
            },
            {
              onSuccess: () => {
                setState(prev => ({
                  ...prev,
                  deploymentStatus: 'processing'
                }));
              }
            }
          );
          return { digest };
        }
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          deploymentStatus: 'confirming',
          transactionDigest: result.transactionDigest
        }));

        // Wait for confirmation
        const confirmed = await contractService.waitForTransaction(result.transactionDigest);

        setState(prev => ({
          ...prev,
          isDeploying: false,
          deploymentStatus: confirmed ? 'success' : 'failed',
          error: confirmed ? undefined : 'Transaction failed to confirm'
        }));
      } else {
        setState(prev => ({
          ...prev,
          isDeploying: false,
          deploymentStatus: 'failed',
          error: result.error
        }));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      setState(prev => ({
        ...prev,
        isDeploying: false,
        deploymentStatus: 'failed',
        error: errorMessage
      }));
      return {
        success: false,
        deploymentId: '',
        error: errorMessage,
        transactionDigest: ''
      };
    }
  }, [account, contractService, signAndExecute]);

  /**
   * Get transaction status
   */
  const getTransactionStatus = useCallback(async (digest: string): Promise<TransactionStatus> => {
    return await contractService.trackTransaction(digest);
  }, [contractService]);

  /**
   * Reset deployment state
   */
  const resetState = useCallback(() => {
    setState({
      isDeploying: false,
      deploymentStatus: 'idle'
    });
  }, []);

  return {
    state,
    deployWithContract,
    deployWithUSDC,
    getTransactionStatus,
    resetState,
    isConnected: !!account
  };
}