# Avenox Contract API Reference

## Latest Deployment (Dec 2024)

**Network:** Sui Testnet  
**Package ID:** `0x155be5fad0cd3a1cda64073eaa32481dfc951396e63bad8b2bcc20feb8198438`  
**Gas Used:** ~0.135 SUI

## Contract Objects

### Shared Objects

- **DeploymentRegistry:** `0x853aad16cf254d6049ec8191af960053d43d4bdbd6073b0ff85b26718e399f1a`
- **SwapRouter (Cetus):** `0xae47ac210c3f27a723db432f7a48f3e5d89bf72b5098d4949003bd1c93157181`
- **SubscriptionRegistry:** `0xccf05bdcee9ba5fc1724cacbd762247e623bf60e62cbac6a771c83c0c1df5e22`

### Admin Objects

- **DeploymentProcessor:** `0x7b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b`
- **ProcessorAdmin:** `0x0000000000000000000000000000000000000000000000000000000000005678`

## 1. Payment Processors

There are two payment processors now:

### Basic Payment Processor

**Module:** `avenox::payment_processor`

Basic USDC collection and mock swaps:

```move
public struct PaymentProcessor<phantom U, phantom W> has key {
    id: UID,
    usdc_buffer: Balance<U>,         // USDC buffer
    wal_buffer: Balance<W>,          // WAL buffer
    treasury_address: address,       // Treasury
    auto_swap_threshold: u64,        // 100 USDC trigger
    total_usdc_processed: u64,       // Stats
    total_wal_distributed: u64,
    slippage_tolerance_bps: u64,     // 3% default
    pool_address: address,           // DEX pool
}
```

### Cetus Payment Processor (NEW!)

**Module:** `avenox::payment_processor_cetus`

Advanced DEX integration with real swaps:

```move
public struct PaymentProcessorCetus<phantom U, phantom W> has key {
    id: UID,
    treasury_address: address,
    usdc_buffer: Balance<U>,
    wal_buffer: Balance<W>,
    auto_swap_threshold: u64,
    slippage_tolerance_bps: u64,
    swap_history: Table<ID, SwapRecord>,
    pool_configs: Table<String, PoolConfig>,
    cetus_pools: Table<String, address>,
    admin: address,
    protocol_fee_bps: u64,
    // ... more fields
}
```

#### Swap Records (Cetus)

```move
public struct SwapRecord has store, copy, drop {
    swap_id: ID,
    user: address,
    amount_in: u64,
    amount_out: u64,
    token_in_type: String,
    token_out_type: String,
    pool_used: address,
    timestamp: u64,
    slippage_bps: u64,
    fee_paid: u64,
    success: bool
}
```

### Key Functions

#### Basic Processor Functions

**init_processor<U, W>** - Create basic processor:

```typescript
{
  target: `${packageId}::payment_processor::init_processor`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [ctx]
}
```

**process_payment<U, W>** - Process USDC payment:

```typescript
{
  target: `${packageId}::payment_processor::process_payment`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,           // &mut PaymentProcessor<U, W>
    payment,            // Coin<U>
    expected_wal,       // u64
    deployment_id,      // vector<u8>
    clock,              // &Clock
    ctx                 // &mut TxContext
  ]
}
```

#### Cetus Processor Functions

**init_processor<U, W>** - Create Cetus processor:

```typescript
{
  target: `${packageId}::payment_processor_cetus::init_processor`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    admin,              // &ProcessorAdmin
    treasury,           // address
    ctx                 // &mut TxContext
  ]
}
```

**add_pool_config<U, W>** - Add Cetus pool:

```typescript
{
  target: `${packageId}::payment_processor_cetus::add_pool_config`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &mut PaymentProcessorCetus<U, W>
    admin,              // &ProcessorAdmin
    pool_name,          // vector<u8>
    pool_address,       // address
    fee_tier,           // u64
    clock,              // &Clock
    ctx                 // &mut TxContext
  ]
}
```

**swap_through_cetus<U, W>** - Execute real swap:

```typescript
{
  target: `${packageId}::payment_processor_cetus::swap_through_cetus`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &mut PaymentProcessorCetus<U, W>
    router,             // &mut SwapRouter
    payment,            // Coin<U>
    pool_name,          // vector<u8>
    min_amount_out,     // u64
    clock,              // &Clock
    ctx                 // &mut TxContext
  ]
}
```

**get_swap_quote<U, W>** - Get price quote:

```typescript
{
  target: `${packageId}::payment_processor_cetus::get_swap_quote`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &PaymentProcessorCetus<U, W>
    amount_in,          // u64
    pool_name           // vector<u8>
  ]
}
```

**batch_swap<U, W>** - Process multiple payments:

```typescript
{
  target: `${packageId}::payment_processor_cetus::batch_swap`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &mut PaymentProcessorCetus<U, W>
    router,             // &mut SwapRouter
    payments,           // vector<Coin<U>>
    pool_name,          // vector<u8>
    clock,              // &Clock
    ctx                 // &mut TxContext
  ]
}
```

## 2. Subscription Manager

**Module:** `avenox::subscription_manager`

Handles user tiers and billing.

### Main Structures

```move
public struct SubscriptionRegistry has key {
    id: UID,
    subscriptions: Table<address, Subscription>,
    total_revenue: u64,
    active_subscriptions: vector<u64>,    // count per tier
    treasury: address,
    tier_prices: vector<u64>,            // prices in USDC
    deployment_limits: vector<u64>,       // limits per tier
    bandwidth_limits: vector<u64>,        // MB limits per tier
}
```

```move
public struct Subscription has copy, drop, store {
    user: address,
    tier: u8,                    // 0=Free, 1=Starter, 2=Growth, 3=Enterprise
    start_date: u64,
    end_date: u64,
    deployments_used: u64,       // current month usage
    bandwidth_used: u64,
    auto_renew: bool,
    payment_history: vector<PaymentRecord>,
    total_spent: u64,
}
```

### Tiers

- `TIER_FREE: u8 = 0` - Free (3 deployments, 100MB)
- `TIER_STARTER: u8 = 1` - $10/month (10 deployments, 1GB)
- `TIER_GROWTH: u8 = 2` - $50/month (100 deployments, 10GB)
- `TIER_ENTERPRISE: u8 = 3` - $200/month (unlimited)

### Functions

**init_registry** - Initialize subscription system:

```typescript
{
  target: `${packageId}::subscription_manager::init_registry`,
  arguments: [
    treasury,           // address
    ctx                 // &mut TxContext
  ]
}
```

**subscribe<T>** - Create new subscription:

```typescript
{
  target: `${packageId}::subscription_manager::subscribe`,
  typeArguments: [USDC_TYPE],
  arguments: [
    registry,          // &mut SubscriptionRegistry
    payment,          // Coin<T>
    tier,             // u8
    auto_renew,       // bool
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

**renew_subscription<T>** - Renew subscription:

```typescript
{
  target: `${packageId}::subscription_manager::renew_subscription`,
  typeArguments: [USDC_TYPE],
  arguments: [
    registry,          // &mut SubscriptionRegistry
    payment,          // Coin<T>
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

**record_deployment** - Track deployment usage:

```typescript
{
  target: `${packageId}::subscription_manager::record_deployment`,
  arguments: [
    registry,          // &mut SubscriptionRegistry
    tracker,           // &mut UsageTracker
    deployment_id,     // ID
    bandwidth_mb,      // u64
    storage_mb,        // u64
    build_time_ms,     // u64
    clock,             // &Clock
    ctx                // &mut TxContext
  ]
}
```

**upgrade_tier<T>** - Upgrade subscription:

```typescript
{
  target: `${packageId}::subscription_manager::upgrade_tier`,
  typeArguments: [USDC_TYPE],
  arguments: [
    registry,          // &mut SubscriptionRegistry
    payment,          // Coin<T>
    new_tier,         // u8
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

**cancel_subscription** - Cancel auto-renewal:

```typescript
{
  target: `${packageId}::subscription_manager::cancel_subscription`,
  arguments: [
    registry,          // &mut SubscriptionRegistry
    ctx               // &mut TxContext
  ]
}
```

**can_deploy** - Check if user can deploy:

```typescript
// View function - use sui_devInspectTransactionBlock
{
  target: `${packageId}::subscription_manager::can_deploy`,
  arguments: [
    registry,          // &SubscriptionRegistry
    user,             // address
    clock             // &Clock
  ]
}
```

## 3. Deployment Registry

**Module:** `avenox::deployment_registry`

Tracks all deployments and their status.

### Main Structure

```move
public struct DeploymentRegistry has key {
    id: UID,
    user_deployments: Table<address, vector<ID>>,
    deployments: Table<ID, DeploymentRecord>,
    total_deployments: u64,
    total_usdc_collected: u64,
    treasury_address: address,
    min_payment_usdc: u64,        // 5 USDC minimum
    platform_fee_bps: u64,        // 20% platform fee
}
```

```move
public struct DeploymentRecord has copy, drop, store {
    deployment_id: ID,
    user: address,
    repo_url: String,
    commit_hash: String,
    branch: String,
    walrus_site_id: String,       // final URL
    usdc_paid: u64,
    estimated_wal: u64,
    actual_wal_used: u64,
    created_at: u64,
    deployed_at: u64,
    status: u8,                   // 0=Pending, 1=Processing, 2=Deployed, 3=Failed
    build_command: String,        // npm run build, etc
    output_dir: String,           // dist/, build/, etc
    version: u64,                 // auto-incremented
    error_message: String,
    environment: String,          // prod, staging, etc
    deployment_type: u8,          // 0=Regular, 1=Rollback
    parent_deployment_id: Option<ID>,
    metadata: String,             // extra JSON data
}
```

```move
public struct DeploymentRequest has key {
    id: UID,
    user: address,
    deployment_id: ID,
    repo_url: String,
    branch: String,
    commit_hash: String,
    build_command: String,
    output_dir: String,
    usdc_paid: u64,
    estimated_wal: u64,
    created_at: u64,
}
```

### Status Constants

- `STATUS_PENDING: u8 = 0` - just submitted
- `STATUS_PROCESSING: u8 = 1` - building
- `STATUS_DEPLOYED: u8 = 2` - live!
- `STATUS_FAILED: u8 = 3` - failed

### Functions

**init_registry** - Initialize deployment system:

```typescript
{
  target: `${packageId}::deployment_registry::init_registry`,
  arguments: [
    treasury_address,  // address
    ctx               // &mut TxContext
  ]
}
```

**request_deployment<T>** - Request new deployment:

```typescript
{
  target: `${packageId}::deployment_registry::request_deployment`,
  typeArguments: [USDC_TYPE],
  arguments: [
    registry,          // &mut DeploymentRegistry
    payment,          // Coin<T>
    repo_url,         // String
    branch,           // String
    commit_hash,      // String
    build_command,    // String
    output_dir,       // String
    estimated_wal,    // u64
    environment,      // String
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

**mark_processing** - Mark as building (backend only):

```typescript
{
  target: `${packageId}::deployment_registry::mark_processing`,
  arguments: [
    registry,          // &mut DeploymentRegistry
    processor,         // &DeploymentProcessor
    deployment_id,     // ID
    ctx               // &mut TxContext
  ]
}
```

**mark_deployed** - Mark as completed:

```typescript
{
  target: `${packageId}::deployment_registry::mark_deployed`,
  arguments: [
    registry,          // &mut DeploymentRegistry
    processor,         // &DeploymentProcessor
    deployment_id,     // ID
    walrus_site_id,   // String
    actual_wal_used,  // u64
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

**mark_failed** - Mark as failed:

```typescript
{
  target: `${packageId}::deployment_registry::mark_failed`,
  arguments: [
    registry,          // &mut DeploymentRegistry
    processor,         // &DeploymentProcessor
    deployment_id,     // ID
    error_message,    // String
    ctx               // &mut TxContext
  ]
}
```

**request_rollback_deployment<T>** - Rollback to previous version:

```typescript
{
  target: `${packageId}::deployment_registry::request_rollback_deployment`,
  typeArguments: [USDC_TYPE],
  arguments: [
    registry,          // &mut DeploymentRegistry
    payment,          // Coin<T>
    parent_deployment_id, // ID
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

**get_deployment_info** - Get deployment details:

```typescript
// View function - use sui_devInspectTransactionBlock
{
  target: `${packageId}::deployment_registry::get_deployment_info`,
  arguments: [
    registry,          // &DeploymentRegistry
    deployment_id     // ID
  ]
}
```

**get_user_deployments** - Get all user deployments:

```typescript
{
  target: `${packageId}::deployment_registry::get_user_deployments`,
  arguments: [
    registry,          // &DeploymentRegistry
    user_address      // address
  ]
}
```

## Error Codes

### Payment Processors

- `E_INSUFFICIENT_BALANCE: 2001` - Not enough balance
- `E_SLIPPAGE_EXCEEDED: 2002` - Price moved too much
- `E_INVALID_POOL: 2003` - Pool not found/inactive
- `E_UNAUTHORIZED: 2004` - Not authorized
- `E_NO_LIQUIDITY: 2005` - No liquidity in pool
- `E_SWAP_FAILED: 2006` - Swap failed
- `E_POOL_NOT_FOUND: 2007` - Pool config not found

### Subscription Manager

- `E_INSUFFICIENT_PAYMENT: 3001` - Payment too low
- `E_SUBSCRIPTION_NOT_FOUND: 3002` - No subscription found
- `E_ALREADY_SUBSCRIBED: 3003` - Already subscribed
- `E_INVALID_TIER: 3005` - Invalid tier
- `E_USAGE_EXCEEDED: 3006` - Usage limit exceeded

### Deployment Registry

- `E_INSUFFICIENT_PAYMENT: 1001` - Payment too low (min 5 USDC)
- `E_UNAUTHORIZED: 1003` - Not authorized
- `E_INVALID_STATUS: 1004` - Invalid status change

## Events

### Payment Events

```move
public struct PaymentProcessed has copy, drop {
    user: address,
    usdc_amount: u64,
    deployment_id: vector<u8>,
    timestamp: u64,
}

public struct SwapExecuted has copy, drop {
    swap_id: ID,
    amount_in: u64,
    amount_out: u64,
    token_in_type: String,
    token_out_type: String,
    pool_address: address,
    timestamp: u64,
    success: bool
}
```

### Subscription Events

```move
public struct SubscriptionCreated has copy, drop {
    user: address,
    tier: u8,
    expires_at: u64,
    amount_paid: u64,
}

public struct SubscriptionRenewed has copy, drop {
    user: address,
    tier: u8,
    new_expires_at: u64,
    amount_paid: u64,
}
```

### Deployment Events

```move
public struct DeploymentCreated has copy, drop {
    deployment_id: ID,
    user: address,
    repo_url: String,
    usdc_paid: u64,
    estimated_wal: u64,
    timestamp: u64,
}

public struct DeploymentCompleted has copy, drop {
    deployment_id: ID,
    user: address,
    walrus_site_id: String,
    actual_wal_used: u64,
    timestamp: u64,
}
```

## Integration Notes

### Dependencies

```json
{
  "@mysten/sui": "latest",
  "@mysten/dapp-kit": "latest"
}
```

### Token Types

- **USDC Testnet:** `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`
- **WAL Token:** TBD (custom token)

### Important Objects

- **Clock:** `0x6` (testnet)
- **Package ID:** `0x155be5fad0cd3a1cda64073eaa32481dfc951396e63bad8b2bcc20feb8198438`

### Usage Tips

1. All entry functions need `&mut TxContext`
2. Payment functions need `Coin<T>` objects
3. Time functions need `&Clock`
4. View functions use `sui_devInspectTransactionBlock`
5. Admin functions need admin capability objects

### Gas Costs

- Simple calls: ~1-2M gas
- Complex operations: ~3-5M gas
- Deployments: ~2-3M gas
- Cetus swaps: ~5-10M gas (depending on complexity)

---

That's it! Your complete API reference for the Avenox smart contracts. The new Cetus integration makes this a real DeFi-enabled deployment platform.
