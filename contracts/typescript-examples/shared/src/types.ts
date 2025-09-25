// Shared types for Avenox smart contracts

export const AVENOX_CONFIG = {
  PACKAGE_ID: '0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471',
  SUBSCRIPTION_REGISTRY: '0x42d3ce0754b4e9684a12874a3b312f8097f2d87d69e595f08af7e8468980b237',
  DEPLOYMENT_REGISTRY: '0xa5fc20fda466733d493a8af44318f564d29278bd30e7d269571afdae1c07bad5',
  CLOCK_ID: '0x6',
  USDC_TESTNET: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
  WAL_TOKEN: 'WAL_TOKEN_TYPE_HERE', // To be replaced when WAL token is deployed
} as const;

// Subscription Types
export enum SubscriptionTier {
  FREE = 0,
  STARTER = 1,
  GROWTH = 2,
}

export interface Subscription {
  user: string;
  tier: SubscriptionTier;
  expires_at: string;
  deployments_used: string;
  deployments_limit: string;
  auto_renew: boolean;
  created_at: string;
  last_payment: string;
}

export interface SubscriptionRegistry {
  id: { id: string };
  subscriptions: { type: string; fields: { id: { id: string } } };
  user_deployments: { type: string; fields: { id: { id: string } } };
  total_subscribers: string;
  total_revenue: string;
}

// Deployment Types
export enum DeploymentStatus {
  PENDING = 0,
  PROCESSING = 1,
  DEPLOYED = 2,
  FAILED = 3,
}

export enum DeploymentType {
  REGULAR = 0,
  STAGING = 1,
  ROLLBACK = 2,
}

export interface DeploymentRecord {
  deployment_id: string;
  user: string;
  repo_url: string;
  commit_hash: string;
  branch: string;
  walrus_site_id: string;
  usdc_paid: string;
  estimated_wal: string;
  actual_wal_used: string;
  created_at: string;
  deployed_at: string;
  status: DeploymentStatus;
  build_command: string;
  output_dir: string;
  version: string;
  error_message: string;
  environment: string;
  deployment_type: DeploymentType;
  parent_deployment_id?: string;
  metadata: string;
}

export interface DeploymentRequest {
  id: { id: string };
  user: string;
  deployment_id: string;
  repo_url: string;
  branch: string;
  commit_hash: string;
  build_command: string;
  output_dir: string;
  usdc_paid: string;
  estimated_wal: string;
  created_at: string;
}

// Payment Processor Types
export interface PaymentProcessor<U, W> {
  id: { id: string };
  usdc_balance: { type: string; fields: { balance: string } };
  wal_balance: { type: string; fields: { balance: string } };
  treasury_address: string;
  swap_rate: string;
  max_slippage: string;
  min_swap_amount: string;
  is_active: boolean;
}

export interface PaymentReceipt {
  id: { id: string };
  user: string;
  usdc_amount: string;
  expected_wal: string;
  actual_wal: string;
  timestamp: string;
  swap_rate: string;
}

// Event Types
export interface PaymentProcessedEvent {
  user: string;
  usdc_amount: string;
  wal_amount: string;
  swap_rate: string;
  timestamp: string;
}

export interface SubscriptionCreatedEvent {
  user: string;
  tier: SubscriptionTier;
  expires_at: string;
  amount_paid: string;
}

export interface DeploymentRequestedEvent {
  deployment_id: string;
  user: string;
  repo_url: string;
  estimated_wal: string;
}

export interface DeploymentCompletedEvent {
  deployment_id: string;
  user: string;
  walrus_site_id: string;
  actual_wal_used: string;
}

// Transaction Builder Types
export interface SubscribeParams {
  registry: string;
  payment: { objectId: string; version: string; digest: string };
  tier: SubscriptionTier;
  autoRenew: boolean;
}

export interface DeploymentParams {
  registry: string;
  subscriptionRegistry: string;
  payment: { objectId: string; version: string; digest: string };
  repoUrl: string;
  branch: string;
  commitHash: string;
  buildCommand: string;
  outputDir: string;
  environment: string;
  estimatedWal: string;
}

export interface PaymentParams {
  processor: string;
  usdcCoin: { objectId: string; version: string; digest: string };
  expectedWalAmount: string;
}

// Error Types
export enum ErrorCodes {
  // Payment Processor
  E_INSUFFICIENT_BALANCE = 2001,

  // Subscription Manager
  E_INSUFFICIENT_PAYMENT = 3001,
  E_SUBSCRIPTION_NOT_FOUND = 3002,
  E_ALREADY_SUBSCRIBED = 3003,
  E_INVALID_TIER = 3005,

  // Deployment Registry
  E_INSUFFICIENT_PAYMENT_DEPLOYMENT = 1001,
  E_UNAUTHORIZED = 1003,
  E_INVALID_STATUS = 1004,
}

// Utility Types
export interface TierInfo {
  tier: SubscriptionTier;
  name: string;
  price: string; // in USDC (6 decimals)
  deploymentLimit: number;
  features: string[];
}

export const TIER_INFO: Record<SubscriptionTier, TierInfo> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    name: 'Free',
    price: '0',
    deploymentLimit: 1,
    features: ['1 deployment per month', 'Community support'],
  },
  [SubscriptionTier.STARTER]: {
    tier: SubscriptionTier.STARTER,
    name: 'Starter',
    price: '10000000', // $10 with 6 decimals
    deploymentLimit: 10,
    features: ['10 deployments per month', 'Email support', 'Basic analytics'],
  },
  [SubscriptionTier.GROWTH]: {
    tier: SubscriptionTier.GROWTH,
    name: 'Growth',
    price: '50000000', // $50 with 6 decimals
    deploymentLimit: 100,
    features: ['100 deployments per month', 'Priority support', 'Advanced analytics', 'Custom domains'],
  },
};

// Utility Functions
export function formatUSDC(amount: string | number): string {
  const num = typeof amount === 'string' ? parseInt(amount) : amount;
  return (num / 1_000_000).toFixed(2);
}

export function formatTimestamp(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  return new Date(ts).toLocaleString();
}

export function isSubscriptionActive(subscription: Subscription): boolean {
  const now = Date.now();
  const expiresAt = parseInt(subscription.expires_at);
  return expiresAt > now;
}

export function getDaysUntilExpiry(subscription: Subscription): number {
  const now = Date.now();
  const expiresAt = parseInt(subscription.expires_at);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((expiresAt - now) / msPerDay));
}

export function buildTarget(packageId: string, module: string, functionName: string): string {
  return `${packageId}::${module}::${functionName}`;
}