/**
 * TypeScript type definitions for Avenox smart contracts
 */

export interface DeploymentRecord {
  deploymentId: string;
  user: string;
  repoUrl: string;
  commitHash: string;
  branch: string;
  walrusSiteId: string;
  usdcPaid: bigint;
  estimatedWal: bigint;
  actualWalUsed: bigint;
  createdAt: bigint;
  deployedAt: bigint;
  status: number;
  buildCommand: string;
  outputDir: string;
  version: bigint;
  errorMessage: string;
  environment: string;
  deploymentType: number;
  parentDeploymentId?: string;
  metadata: string;
}

export interface Subscription {
  user: string;
  tier: number;
  startDate: bigint;
  endDate: bigint;
  deploymentsUsed: bigint;
  bandwidthUsed: bigint;
  autoRenew: boolean;
  paymentHistory: PaymentRecord[];
  totalSpent: bigint;
}

export interface PaymentRecord {
  paymentId: string;
  amount: bigint;
  timestamp: bigint;
  tier: number;
  transactionHash: string;
}

export interface SwapRecord {
  swapId: string;
  user: string;
  amountIn: bigint;
  amountOut: bigint;
  tokenInType: string;
  tokenOutType: string;
  poolUsed: string;
  timestamp: bigint;
  slippageBps: bigint;
  feePaid: bigint;
  success: boolean;
}

export interface SwapQuote {
  amountIn: bigint;
  expectedAmountOut: bigint;
  minimumAmountOut: bigint;
  priceImpactBps: bigint;
  feeAmount: bigint;
  poolAddress: string;
  route: string[];
}

export interface ProcessorStats {
  totalUsdcProcessed: bigint;
  totalWalDistributed: bigint;
  usdcBuffer: bigint;
  walBuffer: bigint;
  totalFeesCollected: bigint;
}

export interface DeploymentRequest {
  repoUrl: string;
  branch: string;
  commitHash: string;
  buildCommand: string;
  outputDir: string;
  estimatedWal: bigint;
  environment: string;
  metadata?: Record<string, any>;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  walrusSiteId?: string;
  publicUrl?: string;
  error?: string;
  transactionDigest: string;
}

export interface TransactionStatus {
  status: 'pending' | 'processing' | 'success' | 'failed';
  message: string;
  digest?: string;
  error?: string;
}