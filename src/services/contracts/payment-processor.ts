/**
 * Payment Processor Contract Service
 * Handles USDC payments and transfers without Cetus swaps
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { CONTRACT_CONFIG } from '@/config/contracts';
import type { ProcessorStats } from '@/types/contracts';

export class PaymentProcessorService {
  private client: SuiClient;

  constructor(client: SuiClient) {
    this.client = client;
  }

  /**
   * Process a payment with USDC
   */
  async processPayment(
    payment: {
      coinObjectId: string;
      amount: bigint;
    },
    deploymentId: string,
    expectedWal: bigint,
    signer: string
  ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> {
    try {
      const tx = new Transaction();

      // Split the exact amount from the coin
      const [paymentCoin] = tx.splitCoins(tx.object(payment.coinObjectId), [
        tx.pure.u64(payment.amount)
      ]);

      // Call process_payment function
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.PAYMENT_PROCESSOR}::process_payment`,
        typeArguments: [CONTRACT_CONFIG.USDC_TYPE, CONTRACT_CONFIG.WAL_TYPE],
        arguments: [
          tx.object('PROCESSOR_ADDRESS'), // This would be the shared processor object
          paymentCoin,
          tx.pure.u64(expectedWal),
          tx.pure.vector('u8', Array.from(new TextEncoder().encode(deploymentId))),
          tx.object(CONTRACT_CONFIG.CLOCK)
        ]
      });

      // Set gas budget
      tx.setGasBudget(10000000); // 0.01 SUI

      return { success: true, transaction: tx };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment'
      };
    }
  }

  /**
   * Simple USDC transfer for deployment payment
   * This is a direct transfer without going through the payment processor
   */
  async transferUSDCForDeployment(
    payment: {
      coinObjectId: string;
      amount: bigint;
    },
    deploymentData: {
      repoUrl: string;
      branch: string;
      commitHash: string;
    },
    signer: string
  ): Promise<Transaction> {
    const tx = new Transaction();

    // Split the exact amount from the coin
    const [paymentCoin] = tx.splitCoins(tx.object(payment.coinObjectId), [
      tx.pure.u64(payment.amount)
    ]);

    // Transfer to treasury address (can be updated to contract address)
    tx.transferObjects(
      [paymentCoin],
      tx.pure.address('0x0000000000000000000000000000000000000000000000000000000000000001') // Treasury address
    );

    // Set gas budget
    tx.setGasBudget(10000000); // 0.01 SUI

    return tx;
  }

  /**
   * Get processor statistics
   */
  async getProcessorStats(processorAddress: string): Promise<ProcessorStats | null> {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULES.PAYMENT_PROCESSOR}::get_processor_stats`,
        typeArguments: [CONTRACT_CONFIG.USDC_TYPE, CONTRACT_CONFIG.WAL_TYPE],
        arguments: [
          tx.object(processorAddress)
        ]
      });

      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000'
      });

      if (result.results && result.results.length > 0) {
        const returnValues = result.results[0].returnValues;
        if (returnValues && returnValues.length > 0) {
          return this.parseProcessorStats(returnValues[0]);
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching processor stats:', error);
      return null;
    }
  }

  /**
   * Parse processor stats from return values
   */
  private parseProcessorStats(data: any): ProcessorStats {
    // This would need proper BCS deserialization in production
    return {
      totalUsdcProcessed: BigInt(data[0] || 0),
      totalWalDistributed: BigInt(data[1] || 0),
      usdcBuffer: BigInt(data[2] || 0),
      walBuffer: BigInt(data[3] || 0),
      totalFeesCollected: BigInt(data[4] || 0)
    };
  }

  /**
   * Calculate payment amount including fees
   */
  calculateTotalPayment(baseAmount: bigint): bigint {
    // Add platform fee
    const fee = (baseAmount * BigInt(CONTRACT_CONFIG.PLATFORM_FEE_BPS)) / BigInt(10000);
    return baseAmount + fee;
  }

  /**
   * Format USDC amount for display
   */
  formatUSDC(amount: bigint): string {
    const dollars = Number(amount) / 1_000_000;
    return `$${dollars.toFixed(2)}`;
  }
}