/**
 * USDC Token Service
 * Handles USDC balance queries and coin management
 */

import { SuiClient, CoinBalance } from '@mysten/sui/client';
import { CONTRACT_CONFIG } from '@/config/contracts';

export interface USDCCoin {
  objectId: string;
  version: string;
  digest: string;
  balance: bigint;
}

export class USDCService {
  private client: SuiClient;

  constructor(client: SuiClient) {
    this.client = client;
  }

  /**
   * Get USDC balance for an address
   */
  async getBalance(address: string): Promise<CoinBalance | null> {
    try {
      const balance = await this.client.getBalance({
        owner: address,
        coinType: CONTRACT_CONFIG.USDC_TYPE
      });

      return balance;
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      return null;
    }
  }

  /**
   * Get all USDC coins owned by an address
   */
  async getCoins(address: string): Promise<USDCCoin[]> {
    try {
      const coins = await this.client.getCoins({
        owner: address,
        coinType: CONTRACT_CONFIG.USDC_TYPE
      });

      return coins.data.map(coin => ({
        objectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest,
        balance: BigInt(coin.balance)
      }));
    } catch (error) {
      console.error('Error fetching USDC coins:', error);
      return [];
    }
  }

  /**
   * Get the largest USDC coin (useful for payments)
   */
  async getLargestCoin(address: string): Promise<USDCCoin | null> {
    const coins = await this.getCoins(address);

    if (coins.length === 0) {
      return null;
    }

    // Sort by balance descending and return the largest
    coins.sort((a, b) => {
      if (a.balance > b.balance) return -1;
      if (a.balance < b.balance) return 1;
      return 0;
    });

    return coins[0];
  }

  /**
   * Check if user has sufficient USDC balance
   */
  async hasSufficientBalance(address: string, requiredAmount: bigint): Promise<boolean> {
    const balance = await this.getBalance(address);

    if (!balance) {
      return false;
    }

    return BigInt(balance.totalBalance) >= requiredAmount;
  }

  /**
   * Format USDC amount for display (with 6 decimals)
   */
  formatUSDC(amount: bigint | string | number): string {
    const value = typeof amount === 'bigint' ? amount : BigInt(amount);
    const dollars = Number(value) / 1_000_000;
    return `$${dollars.toFixed(2)}`;
  }

  /**
   * Parse USDC amount from string input
   */
  parseUSDC(amount: string): bigint {
    // Remove $ sign if present
    const cleanAmount = amount.replace('$', '').trim();
    const dollars = parseFloat(cleanAmount);

    if (isNaN(dollars) || dollars < 0) {
      throw new Error('Invalid USDC amount');
    }

    // Convert to 6 decimal places
    return BigInt(Math.floor(dollars * 1_000_000));
  }

  /**
   * Get testnet USDC faucet URL
   */
  getTestnetFaucetUrl(): string {
    return 'https://testnet.polymedia.app/faucet';
  }

  /**
   * Check if on testnet
   */
  isTestnet(): boolean {
    return CONTRACT_CONFIG.USDC_TYPE.includes('0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29');
  }
}