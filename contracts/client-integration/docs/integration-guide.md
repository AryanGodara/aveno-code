# Avenox Integration Guide

This guide walks you through integrating Avenox smart contracts into your application.

## Quick Start

### 1. Installation

```bash
# Frontend (React + dApp Kit)
cd frontend
bun install

# Backend (Node.js)
cd backend
bun install
```

### 2. Environment Setup

Create `.env` files in both frontend and backend:

```bash
# Copy example files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Run Examples

```bash
# Frontend development server
bun dev:frontend

# Backend examples
bun example:subscription
bun example:deployment
bun example:basic-flow
```

## Integration Patterns

### Frontend Integration (React + dApp Kit)

#### 1. Setup Providers

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'

const queryClient = new QueryClient()
const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider>
          <YourApp />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
```

#### 2. Connect Wallet

```tsx
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'

function WalletConnection() {
  const account = useCurrentAccount()

  return (
    <div>
      <ConnectButton />
      {account && <p>Connected: {account.address}</p>}
    </div>
  )
}
```

#### 3. Subscribe to Plan

```tsx
import { useSignTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

function SubscriptionManager() {
  const { mutate: signTransaction } = useSignTransaction()

  const handleSubscribe = async (tier: SubscriptionTier) => {
    const tx = new Transaction()

    // Prepare payment coin
    const [paymentCoin] = tx.splitCoins(
      tx.object('USDC_COIN_ID'),
      [TIER_INFO[tier].price]
    )

    tx.moveCall({
      target: `${PACKAGE_ID}::subscription_manager::subscribe`,
      typeArguments: [USDC_TOKEN_TYPE],
      arguments: [
        tx.object(SUBSCRIPTION_REGISTRY),
        paymentCoin,
        tx.pure.u8(tier),
        tx.pure.bool(true), // auto_renew
        tx.object(CLOCK_ID)
      ]
    })

    signTransaction({ transaction: tx })
  }

  return <SubscriptionUI onSubscribe={handleSubscribe} />
}
```

### Backend Integration (Node.js)

#### 1. Initialize Client

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

const client = new SuiClient({
  url: getFullnodeUrl('testnet')
})

const keypair = Ed25519Keypair.fromSecretKey(fromHEX(PRIVATE_KEY))
```

#### 2. Query Contract State

```typescript
async function getSubscription(userAddress: string) {
  const tx = new Transaction()

  tx.moveCall({
    target: `${PACKAGE_ID}::subscription_manager::get_subscription_info`,
    arguments: [
      tx.object(SUBSCRIPTION_REGISTRY),
      tx.pure.address(userAddress)
    ]
  })

  const result = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: userAddress
  })

  return result.results?.[0]?.returnValues?.[0]
}
```

#### 3. Execute Transactions

```typescript
async function processDeployment(deploymentId: string) {
  const tx = new Transaction()

  tx.moveCall({
    target: `${PACKAGE_ID}::deployment_registry::mark_deployed`,
    arguments: [
      tx.object(DEPLOYMENT_REGISTRY),
      tx.pure.id(deploymentId),
      tx.pure.string(walrusSiteId),
      tx.pure.u64(walUsed),
      tx.object(CLOCK_ID)
    ]
  })

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true }
  })

  return result
}
```

## Common Patterns

### 1. Coin Management

```typescript
// Split coins for exact payment amounts
async function preparePayment(amount: string) {
  const coins = await client.getCoins({
    owner: userAddress,
    coinType: USDC_TOKEN_TYPE
  })

  const tx = new Transaction()
  const [paymentCoin] = tx.splitCoins(
    tx.object(coins.data[0].coinObjectId),
    [amount]
  )

  return paymentCoin
}
```

### 2. Event Listening

```typescript
// Parse events from transaction result
function parseDeploymentEvents(result: any) {
  const events = result.events || []

  for (const event of events) {
    if (event.type.includes('DeploymentCompleted')) {
      const data = event.parsedJson
      console.log(`Deployment completed: ${data.walrus_site_id}`)
    }
  }
}
```

### 3. Error Handling

```typescript
async function safeTransactionExecution() {
  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx
    })

    if (result.effects?.status?.status === 'success') {
      return result
    } else {
      throw new Error(`Transaction failed: ${result.effects?.status?.error}`)
    }
  } catch (error) {
    console.error('Transaction error:', error)
    throw error
  }
}
```

## Best Practices

### 1. Gas Management

- Always estimate gas before transactions
- Set appropriate gas budgets for complex operations
- Handle gas price fluctuations

### 2. Error Handling

- Implement comprehensive error handling
- Provide user-friendly error messages
- Log detailed errors for debugging

### 3. State Management

- Cache frequently accessed data
- Implement optimistic updates
- Handle loading states properly

### 4. Security

- Validate all user inputs
- Use proper access controls
- Implement rate limiting for admin functions

## API Reference

See [CONTRACT_API.md](../CONTRACT_API.md) for complete API documentation.

## Examples

- **Frontend Examples**: `/frontend/src/components/`
- **Backend Examples**: `/backend/src/examples/`
- **Basic Flow**: Run `bun example:basic-flow` for complete integration example

## Troubleshooting

### Common Issues

1. **Insufficient Gas**: Increase gas budget in transaction options
2. **Invalid Coins**: Ensure USDC coins exist and have sufficient balance
3. **Network Issues**: Check RPC endpoint connectivity
4. **Permission Errors**: Verify admin permissions for restricted functions

### Debug Mode

Enable debug logging:

```typescript
// Set debug environment variable
process.env.DEBUG = 'sui:*'
```

## Support

- Documentation: This guide and API reference
- Examples: Working code in `/examples` directories
- Community: [GitHub Issues](https://github.com/avenox/issues)