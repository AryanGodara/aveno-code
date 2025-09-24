# Getting Started with Avenox TypeScript Examples

This repository contains complete TypeScript integration examples for the Avenox smart contracts deployed on Sui blockchain.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) installed
- Sui wallet with testnet SUI and USDC tokens
- Basic knowledge of React and Node.js

### Installation

```bash
# Install all dependencies
bun install:all
```

### Environment Setup

1. Copy environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Update `.env` files with your configuration:
   - Add your private keys for testing
   - Configure admin keys if you need admin functions

### Run Examples

```bash
# Frontend development server
bun dev:frontend

# Backend examples
bun example:subscription  # Subscription management
bun example:deployment   # Deployment workflows
bun example:basic-flow   # Complete user journey
```

## 📁 Project Structure

```
typescript-examples/
├── frontend/          # React + dApp Kit examples
│   ├── src/
│   │   ├── components/   # UI components for each contract
│   │   ├── pages/        # Application pages
│   │   └── main.tsx      # App entry with providers
│   └── package.json
├── backend/           # Node.js server examples
│   ├── src/
│   │   ├── examples/     # Standalone contract examples
│   │   ├── config.ts     # Configuration management
│   │   └── server.ts     # API server
│   └── package.json
├── shared/            # Shared types and utilities
│   └── src/
│       ├── types.ts      # Contract types and constants
│       └── utils.ts      # Helper functions
└── docs/              # Documentation
    └── integration-guide.md
```

## 🎯 Basic Integration Flow

The complete user journey with Avenox involves:

### 1. **User Onboarding**
- Connect Sui wallet
- Check wallet balance (USDC required)
- View available subscription plans

### 2. **Subscription Management**
- Subscribe to a deployment plan
- Check subscription status and usage
- Upgrade/downgrade tiers
- Manage auto-renewal

### 3. **Application Deployment**
- Request deployment with repository details
- Monitor deployment status
- View deployment results
- Access deployed application

### 4. **Payment Processing**
- Process USDC payments for subscriptions
- Handle WAL token swaps
- Track payment history

## 🧩 Key Components

### Frontend Components

- **`SubscriptionManager`** - Complete subscription UI
- **`DeploymentDashboard`** - Deployment management
- **`PaymentProcessor`** - Payment handling
- **`Layout`** - Navigation and wallet connection

### Backend Examples

- **`subscription-example.ts`** - Subscription lifecycle
- **`deployment-example.ts`** - Deployment workflows
- **`basic-flow-example.ts`** - End-to-end user journey

### Shared Utilities

- **Contract types and constants**
- **Formatting helpers** (amounts, timestamps)
- **Transaction builders**
- **Error handling utilities**

## 💡 Usage Patterns

### Frontend with dApp Kit

```tsx
import { useSignTransaction, useCurrentAccount } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

function MyComponent() {
  const account = useCurrentAccount()
  const { mutate: signTransaction } = useSignTransaction()

  const handleSubscribe = (tier: SubscriptionTier) => {
    const tx = new Transaction()
    // Build transaction...
    signTransaction({ transaction: tx })
  }
}
```

### Backend with Keypair

```typescript
import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' })
const keypair = Ed25519Keypair.fromSecretKey(privateKey)

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx
})
```

## 📚 Contract Information

**Network:** Sui Testnet
**Package ID:** `0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471`

### Key Objects
- **SubscriptionRegistry:** `0x42d3ce0754b4e9684a12874a3b312f8097f2d87d69e595f08af7e8468980b237`
- **DeploymentRegistry:** `0xa5fc20fda466733d493a8af44318f564d29278bd30e7d269571afdae1c07bad5`

## 🔧 Development Tips

### 1. Testing with Testnet
- Get testnet SUI: [Sui Faucet](https://faucet.sui.io)
- Get testnet USDC: [Circle Faucet](https://faucet.circle.com)

### 2. Debugging
- Use `sui_devInspectTransactionBlock` for read-only queries
- Check transaction effects for success/failure status
- Parse events for application-specific data

### 3. Error Handling
- Always check `effects.status.status === 'success'`
- Implement retry logic for network issues
- Provide user-friendly error messages

## 📖 Documentation

- [Complete API Reference](../CONTRACT_API.md)
- [Integration Guide](./docs/integration-guide.md)
- [Contract Source Code](../sources/)

## 🔗 Next Steps

1. **Run the examples** to see live interactions
2. **Modify the code** to suit your application needs
3. **Deploy to mainnet** when ready for production
4. **Integrate into your dApp** using the provided patterns

## ❓ Need Help?

- Check the [troubleshooting section](./docs/integration-guide.md#troubleshooting)
- Review the working examples in `/examples`
- Look at the complete API documentation

---

**Ready to build on Avenox? Start with `bun example:basic-flow` to see the complete integration! 🚀**