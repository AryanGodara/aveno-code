// Shared utilities for Avenox smart contracts

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { AVENOX_CONFIG, SubscriptionTier, DeploymentStatus } from './types.js';

/**
 * Format Sui amounts for display
 */
export function formatSuiAmount(amount: string | number, decimals: number = 9): string {
  const num = typeof amount === 'string' ? parseInt(amount) : amount;
  return (num / Math.pow(10, decimals)).toFixed(decimals === 9 ? 4 : 2);
}

/**
 * Format USDC amounts for display (6 decimals)
 */
export function formatUSDC(amount: string | number): string {
  return formatSuiAmount(amount, 6);
}

/**
 * Parse USDC amount to smart contract format (6 decimals)
 */
export function parseUSDC(amount: string): string {
  return (parseFloat(amount) * 1_000_000).toString();
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  return new Date(ts).toLocaleString();
}

/**
 * Get subscription tier name
 */
export function getTierName(tier: SubscriptionTier): string {
  const names = {
    [SubscriptionTier.FREE]: 'Free',
    [SubscriptionTier.STARTER]: 'Starter',
    [SubscriptionTier.GROWTH]: 'Growth',
  };
  return names[tier] || 'Unknown';
}

/**
 * Get deployment status name
 */
export function getDeploymentStatusName(status: DeploymentStatus): string {
  const names = {
    [DeploymentStatus.PENDING]: 'Pending',
    [DeploymentStatus.PROCESSING]: 'Processing',
    [DeploymentStatus.DEPLOYED]: 'Deployed',
    [DeploymentStatus.FAILED]: 'Failed',
  };
  return names[status] || 'Unknown';
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(expiresAt: string): boolean {
  const now = Date.now();
  const expiry = parseInt(expiresAt);
  return expiry > now;
}

/**
 * Calculate days until subscription expires
 */
export function getDaysUntilExpiry(expiresAt: string): number {
  const now = Date.now();
  const expiry = parseInt(expiresAt);
  const diffMs = expiry - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Validate Sui address format
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

/**
 * Normalize Sui address (ensure 0x prefix and correct length)
 */
export function normalizeSuiAddress(address: string): string {
  if (!address.startsWith('0x')) {
    address = '0x' + address;
  }
  return address.padEnd(66, '0');
}

/**
 * Get transaction explorer URL
 */
export function getTransactionUrl(digest: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  return `https://suiscan.xyz/${network}/tx/${digest}`;
}

/**
 * Get object explorer URL
 */
export function getObjectUrl(objectId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  return `https://suiscan.xyz/${network}/object/${objectId}`;
}

/**
 * Split coins for exact amounts
 */
export async function prepareCoinsForPayment(
  client: SuiClient,
  ownerAddress: string,
  coinType: string,
  amount: string
): Promise<{ coinId: string; splitTx?: Transaction }> {
  const coins = await client.getCoins({
    owner: ownerAddress,
    coinType,
  });

  if (coins.data.length === 0) {
    throw new Error('No coins found for payment');
  }

  // Find a coin with exact amount or larger
  const exactCoin = coins.data.find(coin => coin.balance === amount);
  if (exactCoin) {
    return { coinId: exactCoin.coinObjectId };
  }

  // Find coins to merge/split
  const largerCoin = coins.data.find(coin => parseInt(coin.balance) > parseInt(amount));
  if (largerCoin) {
    // Split the larger coin
    const tx = new Transaction();
    const [splitCoin] = tx.splitCoins(tx.object(largerCoin.coinObjectId), [amount]);
    return { coinId: splitCoin, splitTx: tx };
  }

  // Merge multiple coins if needed
  const totalBalance = coins.data.reduce((sum, coin) => sum + parseInt(coin.balance), 0);
  if (totalBalance < parseInt(amount)) {
    throw new Error('Insufficient balance');
  }

  // Merge coins and then split
  const tx = new Transaction();
  const [primaryCoin, ...otherCoins] = coins.data.map(coin => coin.coinObjectId);

  if (otherCoins.length > 0) {
    tx.mergeCoins(tx.object(primaryCoin), otherCoins.map(id => tx.object(id)));
  }

  const [splitCoin] = tx.splitCoins(tx.object(primaryCoin), [amount]);
  return { coinId: splitCoin, splitTx: tx };
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  client: SuiClient,
  digest: string,
  maxAttempts: number = 30
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        return result;
      } else if (result.effects?.status?.status === 'failure') {
        throw new Error(`Transaction failed: ${result.effects.status.error}`);
      }
    } catch (error: any) {
      if (i === maxAttempts - 1) throw error;
    }

    // Wait 2 seconds before retry
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Transaction confirmation timeout');
}

/**
 * Estimate gas for transaction
 */
export async function estimateGas(
  client: SuiClient,
  tx: Transaction,
  sender: string
): Promise<string> {
  try {
    const result = await client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client }),
    });

    return result.effects.gasUsed?.computationCost || '1000000';
  } catch (error) {
    console.warn('Gas estimation failed, using default:', error);
    return '1000000'; // Default gas estimate
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Parse events from transaction result
 */
export function parseEvents(transactionResult: any): Record<string, any[]> {
  const events: Record<string, any[]> = {};

  if (transactionResult.events) {
    for (const event of transactionResult.events) {
      const eventType = event.type.split('::').pop();
      if (!events[eventType]) {
        events[eventType] = [];
      }
      events[eventType].push(event.parsedJson);
    }
  }

  return events;
}

/**
 * Build module target string
 */
export function buildTarget(module: string, func: string): string {
  return `${AVENOX_CONFIG.PACKAGE_ID}::${module}::${func}`;
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, length: number = 6): string {
  if (address.length <= length * 2 + 2) return address;
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}

/**
 * Generate random deployment ID for testing
 */
export function generateMockDeploymentId(): string {
  return '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}