/**
 * Avenox Smart Contract Configuration
 * Network: Sui Testnet
 * Last Updated: December 2024
 */

export const CONTRACT_CONFIG = {
  // Main Package ID
  PACKAGE_ID: '0x155be5fad0cd3a1cda64073eaa32481dfc951396e63bad8b2bcc20feb8198438',

  // Shared Objects
  DEPLOYMENT_REGISTRY: '0x853aad16cf254d6049ec8191af960053d43d4bdbd6073b0ff85b26718e399f1a',
  SUBSCRIPTION_REGISTRY: '0xccf05bdcee9ba5fc1724cacbd762247e623bf60e62cbac6a771c83c0c1df5e22',

  // Admin Objects (for backend operations)
  DEPLOYMENT_PROCESSOR: '0x7b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b',
  PROCESSOR_ADMIN: '0x0000000000000000000000000000000000000000000000000000000000005678',

  // Token Types
  USDC_TYPE: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
  WAL_TYPE: 'TBD::wal::WAL', // To be updated when WAL token is deployed

  // Module Names
  MODULES: {
    DEPLOYMENT_REGISTRY: 'deployment_registry',
    SUBSCRIPTION_MANAGER: 'subscription_manager',
    PAYMENT_PROCESSOR: 'payment_processor'
  },

  // System Objects
  CLOCK: '0x6',

  // Subscription Tiers
  TIERS: {
    FREE: 0,
    STARTER: 1,
    GROWTH: 2,
    ENTERPRISE: 3
  } as const,

  // Subscription Prices (in USDC with 6 decimals)
  TIER_PRICES: {
    FREE: 0,
    STARTER: 10_000_000, // 10 USDC
    GROWTH: 50_000_000,  // 50 USDC
    ENTERPRISE: 200_000_000 // 200 USDC
  },

  // Deployment Limits
  DEPLOYMENT_LIMITS: {
    FREE: 3,
    STARTER: 10,
    GROWTH: 100,
    ENTERPRISE: Infinity
  },

  // Bandwidth Limits (MB)
  BANDWIDTH_LIMITS: {
    FREE: 100,
    STARTER: 1000,
    GROWTH: 10000,
    ENTERPRISE: Infinity
  },

  // Platform Settings
  MIN_PAYMENT_USDC: 5_000_000, // 5 USDC minimum
  PLATFORM_FEE_BPS: 2000, // 20% platform fee
  DEFAULT_SLIPPAGE_BPS: 300, // 3% slippage tolerance

  // Deployment Status
  STATUS: {
    PENDING: 0,
    PROCESSING: 1,
    DEPLOYED: 2,
    FAILED: 3
  } as const,

  // Error Codes
  ERRORS: {
    // Payment Processor
    E_INSUFFICIENT_BALANCE: 2001,
    E_SLIPPAGE_EXCEEDED: 2002,
    E_INVALID_POOL: 2003,
    E_UNAUTHORIZED: 2004,
    E_NO_LIQUIDITY: 2005,
    E_SWAP_FAILED: 2006,
    E_POOL_NOT_FOUND: 2007,

    // Subscription Manager
    E_INSUFFICIENT_PAYMENT: 3001,
    E_SUBSCRIPTION_NOT_FOUND: 3002,
    E_ALREADY_SUBSCRIBED: 3003,
    E_INVALID_TIER: 3005,
    E_USAGE_EXCEEDED: 3006,

    // Deployment Registry
    E_DEPLOYMENT_INSUFFICIENT_PAYMENT: 1001,
    E_DEPLOYMENT_UNAUTHORIZED: 1003,
    E_INVALID_STATUS: 1004
  }
} as const;

export type Tier = typeof CONTRACT_CONFIG.TIERS[keyof typeof CONTRACT_CONFIG.TIERS];
export type DeploymentStatus = typeof CONTRACT_CONFIG.STATUS[keyof typeof CONTRACT_CONFIG.STATUS];