# Avenox TypeScript Examples

Complete TypeScript examples for interacting with Avenox smart contracts on Sui blockchain.

## Project Structure

```
typescript-examples/
├── frontend/          # React + dApp Kit examples
├── backend/           # Node.js server examples
├── shared/           # Shared types and utilities
└── docs/             # Additional documentation
```

## Quick Start

### Install Dependencies
```bash
bun install:all
```

### Run Frontend Examples
```bash
bun dev:frontend
```

### Run Backend Examples
```bash
# Subscription example
bun example:subscribe

# Deployment example
bun example:deploy

# Payment processing example
bun example:payment
```

## Smart Contract Information

**Network:** Sui Testnet
**Package ID:** `0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471`

### Key Objects
- **SubscriptionRegistry:** `0x42d3ce0754b4e9684a12874a3b312f8097f2d87d69e595f08af7e8468980b237`
- **DeploymentRegistry:** `0xa5fc20fda466733d493a8af44318f564d29278bd30e7d269571afdae1c07bad5`

## Basic Integration Flows

### 1. User Subscription Flow
1. Connect wallet
2. Check existing subscription
3. Subscribe to a tier
4. Track usage
5. Renew/upgrade subscription

### 2. Deployment Flow
1. Connect wallet
2. Check subscription status
3. Request deployment
4. Monitor deployment status
5. View deployment results

### 3. Payment Processing Flow
1. Connect wallet
2. Calculate swap rates
3. Process USDC payment
4. Receive WAL tokens
5. Track payment history

## Examples Included

### Frontend (React + dApp Kit)
- Wallet connection
- Subscription management UI
- Deployment dashboard
- Payment processing
- Real-time status updates

### Backend (Node.js)
- Direct contract interactions
- Batch operations
- Admin functions
- Event listening
- API server examples

## Environment Setup

Create `.env` files in both frontend and backend directories:

```env
VITE_SUI_NETWORK=testnet
VITE_PACKAGE_ID=0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471
VITE_SUBSCRIPTION_REGISTRY=0x42d3ce0754b4e9684a12874a3b312f8097f2d87d69e595f08af7e8468980b237
VITE_DEPLOYMENT_REGISTRY=0xa5fc20fda466733d493a8af44318f564d29278bd30e7d269571afdae1c07bad5
```

## Documentation

- [Contract API Reference](../CONTRACT_API.md)
- [Frontend Integration Guide](./docs/frontend-guide.md)
- [Backend Integration Guide](./docs/backend-guide.md)
- [Common Patterns](./docs/patterns.md)