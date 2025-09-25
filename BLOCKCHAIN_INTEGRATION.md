# Avenox Blockchain Integration

## Overview

This document describes the blockchain integration for the Avenox deployment platform, enabling on-chain payment processing and deployment metadata storage on the Sui blockchain.

## Features

### 🔗 On-Chain Capabilities

1. **USDC Payment Processing**
   - Pay for deployments using testnet USDC tokens
   - Transparent pricing: 5 USDC per deployment
   - All transactions tracked on Sui blockchain

2. **Deployment Metadata Storage**
   - Repository URL, branch, and commit hash stored on-chain
   - Immutable deployment records
   - Version tracking and rollback support

3. **Subscription Management**
   - Tiered subscription plans (Free, Starter, Growth, Enterprise)
   - On-chain usage tracking
   - Automatic deployment limit enforcement

## Architecture

### Smart Contracts (Move)

Located in `/contracts/sources/`:

- **`deployment_registry.move`** - Manages deployment records and status
- **`subscription_manager.move`** - Handles user subscriptions and tiers
- **`payment_processor.move`** - Basic USDC payment processing
- **`payment_processor_cetus.move`** - Advanced DEX integration (not used currently)

### Frontend Integration

#### Core Services (`/src/services/contracts/`)

- **`deployment-registry.ts`** - Deployment contract interactions
- **`subscription-manager.ts`** - Subscription management
- **`payment-processor.ts`** - Payment processing
- **`usdc.ts`** - USDC token operations
- **`index.ts`** - Unified contract service

#### React Hooks (`/src/hooks/`)

- **`use-contract-service.ts`** - Contract service hook
- **`use-deployment.ts`** - Deployment operations with blockchain

#### UI Components

- **`quick-deploy-modal-v2.tsx`** - Enhanced deployment modal with payment options
- **`subscription-status.tsx`** - Real-time subscription status display
- **`deployments-table.tsx`** - Updated to show on-chain status

## Configuration

### Contract Addresses (Testnet)

```typescript
// src/config/contracts.ts
PACKAGE_ID: '0x155be5fad0cd3a1cda64073eaa32481dfc951396e63bad8b2bcc20feb8198438'
DEPLOYMENT_REGISTRY: '0x853aad16cf254d6049ec8191af960053d43d4bdbd6073b0ff85b26718e399f1a'
SUBSCRIPTION_REGISTRY: '0xccf05bdcee9ba5fc1724cacbd762247e623bf60e62cbac6a771c83c0c1df5e22'
USDC_TYPE: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'
```

## User Flow

### Deployment with Blockchain Payment

1. **Connect Wallet**
   - User connects Sui wallet (Sui Wallet, Suiet, etc.)
   - Wallet balance checked for USDC

2. **Select Repository**
   - Choose GitHub repository to deploy
   - Review deployment requirements

3. **Payment Method Selection**
   - **Blockchain Payment**: Pay with USDC, metadata stored on-chain
   - **Traditional**: Standard deployment without blockchain

4. **Transaction Execution**
   - Sign transaction in wallet
   - 5 USDC transferred for deployment
   - Transaction tracked on blockchain

5. **Deployment Processing**
   - Backend triggered after successful payment
   - Build and deployment to Walrus
   - Status updates tracked on-chain

6. **Completion**
   - Deployment URL provided
   - Transaction viewable on Sui Explorer
   - On-chain record created

## Getting Testnet USDC

Users can obtain testnet USDC from:
- [Polymedia Faucet](https://testnet.polymedia.app/faucet)

## Transaction Tracking

All blockchain transactions are viewable on:
- [Sui Vision Explorer](https://testnet.suivision.xyz/)
- [Suiscan](https://suiscan.xyz/testnet/home)

## Subscription Tiers

| Tier | Price | Deployments | Bandwidth |
|------|-------|-------------|-----------|
| Free | $0 | 3/month | 100MB |
| Starter | $10/month | 10/month | 1GB |
| Growth | $50/month | 100/month | 10GB |
| Enterprise | $200/month | Unlimited | Unlimited |

## Development

### Prerequisites

```bash
# Install dependencies
npm install

# Required packages already included:
# - @mysten/sui
# - @mysten/dapp-kit
```

### Environment Setup

The application is configured for Sui Testnet by default. No additional environment variables required for blockchain functionality.

### Testing Deployment Flow

1. Connect a Sui wallet
2. Ensure you have testnet SUI for gas
3. Get testnet USDC from faucet
4. Deploy a repository using blockchain payment
5. Verify transaction on explorer

## Security Considerations

- All payment amounts validated on-chain
- Treasury address hardcoded in contracts
- Slippage protection for future DEX swaps
- Admin functions protected by capability objects

## Future Enhancements

- [ ] Mainnet deployment
- [ ] Cetus DEX integration for USDC/WAL swaps
- [ ] Automated subscription renewals
- [ ] Multi-signature treasury management
- [ ] Cross-chain payment support

## Support

For issues or questions about blockchain integration:
- Review contract code in `/contracts/`
- Check transaction on Sui Explorer
- Verify wallet connectivity
- Ensure sufficient USDC balance