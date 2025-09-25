import { config } from 'dotenv'

// Load environment variables
config()

export const CONFIG = {
  // Sui Configuration
  SUI_NETWORK: process.env.SUI_NETWORK || 'testnet',
  SUI_RPC_URL: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',

  // Admin Configuration
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY || '',
  ADMIN_ADDRESS: process.env.ADMIN_ADDRESS || '',

  // Contract Addresses
  PACKAGE_ID: process.env.PACKAGE_ID || '0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471',
  SUBSCRIPTION_REGISTRY: process.env.SUBSCRIPTION_REGISTRY || '0x42d3ce0754b4e9684a12874a3b312f8097f2d87d69e595f08af7e8468980b237',
  DEPLOYMENT_REGISTRY: process.env.DEPLOYMENT_REGISTRY || '0xa5fc20fda466733d493a8af44318f564d29278bd30e7d269571afdae1c07bad5',
  CLOCK_ID: process.env.CLOCK_ID || '0x6',

  // Token Configuration
  USDC_TOKEN_TYPE: process.env.USDC_TOKEN_TYPE || '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
  WAL_TOKEN_TYPE: process.env.WAL_TOKEN_TYPE || '',

  // Server Configuration
  PORT: parseInt(process.env.PORT || '8080'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '15'),
} as const

// Validate required configuration
export function validateConfig() {
  const required = [
    'PACKAGE_ID',
    'SUBSCRIPTION_REGISTRY',
    'DEPLOYMENT_REGISTRY'
  ] as const

  const missing = required.filter(key => !CONFIG[key])

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`)
  }
}

export default CONFIG