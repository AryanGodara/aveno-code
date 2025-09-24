# Avenox Smart Contracts API Documentation

## Deployment Information

**Network:** Sui Testnet
**Package ID:** `0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471`
**Transaction Digest:** `DcmbdzHbmYX4tUMYXefYDoFzGxSSRwf6pMVMiX9eSLU8`

## Contract Objects

### Shared Objects (Global Singletons)
- **SubscriptionRegistry:** `0x42d3ce0754b4e9684a12874a3b312f8097f2d87d69e595f08af7e8468980b237`
- **DeploymentRegistry:** `0xa5fc20fda466733d493a8af44318f564d29278bd30e7d269571afdae1c07bad5`

### Owner Objects
- **UpgradeCap:** `0xae229aab2aa55a703a07db49083de8cc853ccace6725e8e35145adf38d4cf9f8`
- **DeploymentProcessor:** `0xfafd0fb67d4e8d1ba2e3424706c96e0ffbd494f2c4660a701c1d2117361ff91a`

---

## 1. Payment Processor Module

**Module:** `avenox::payment_processor`

### Data Structures

#### PaymentProcessor<U, W>
```move
public struct PaymentProcessor<phantom U, phantom W> has key {
    id: UID,
    usdc_balance: Balance<U>,        // USDC balance
    wal_balance: Balance<W>,         // WAL token balance
    treasury_address: address,       // Treasury wallet
    swap_rate: u64,                  // WAL per USDC (6 decimals)
    max_slippage: u64,              // Max allowed slippage %
    min_swap_amount: u64,           // Minimum swap amount
    is_active: bool,                // Processor status
}
```

#### PaymentReceipt
```move
public struct PaymentReceipt has key {
    id: UID,
    user: address,
    usdc_amount: u64,
    expected_wal: u64,
    actual_wal: u64,
    timestamp: u64,
    swap_rate: u64,
}
```

### Functions

#### create_processor<U, W>
**Type:** `public fun`
**Description:** Creates a new payment processor instance
```typescript
// Transaction block
{
  target: `${packageId}::payment_processor::create_processor`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    treasury_address,     // address
    initial_swap_rate,    // u64
    max_slippage,        // u64
    min_swap_amount,     // u64
    ctx                  // &mut TxContext
  ]
}
```

#### process_payment<U, W>
**Type:** `public entry fun`
**Description:** Processes USDC payment and swaps to WAL tokens
```typescript
{
  target: `${packageId}::payment_processor::process_payment`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,           // &mut PaymentProcessor<U, W>
    usdc_coin,          // Coin<U>
    expected_wal_amount, // u64
    clock,              // &Clock
    ctx                 // &mut TxContext
  ]
}
```

#### simulate_swap<U, W>
**Type:** `public entry fun`
**Description:** Simulates a swap to get expected WAL amount
```typescript
{
  target: `${packageId}::payment_processor::simulate_swap`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &PaymentProcessor<U, W>
    usdc_amount,       // u64
    ctx                // &mut TxContext
  ]
}
```

#### transfer_wal_to_treasury<U, W>
**Type:** `public entry fun`
**Description:** Transfers WAL tokens to treasury
```typescript
{
  target: `${packageId}::payment_processor::transfer_wal_to_treasury`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &mut PaymentProcessor<U, W>
    amount,            // u64
    ctx                // &mut TxContext
  ]
}
```

#### emergency_withdraw_usdc<U, W>
**Type:** `public entry fun`
**Description:** Emergency withdrawal of USDC (admin only)
```typescript
{
  target: `${packageId}::payment_processor::emergency_withdraw_usdc`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &mut PaymentProcessor<U, W>
    amount,            // u64
    ctx                // &mut TxContext
  ]
}
```

#### update_config<U, W>
**Type:** `public entry fun`
**Description:** Updates processor configuration
```typescript
{
  target: `${packageId}::payment_processor::update_config`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &mut PaymentProcessor<U, W>
    new_swap_rate,     // u64
    new_max_slippage,  // u64
    new_min_amount,    // u64
    ctx                // &mut TxContext
  ]
}
```

#### batch_process_payments<U, W>
**Type:** `public entry fun`
**Description:** Processes multiple payments in batch
```typescript
{
  target: `${packageId}::payment_processor::batch_process_payments`,
  typeArguments: [USDC_TYPE, WAL_TYPE],
  arguments: [
    processor,          // &mut PaymentProcessor<U, W>
    usdc_coins,        // vector<Coin<U>>
    expected_amounts,  // vector<u64>
    clock,             // &Clock
    ctx                // &mut TxContext
  ]
}
```

---

## 2. Subscription Manager Module

**Module:** `avenox::subscription_manager`

### Data Structures

#### SubscriptionRegistry
```move
public struct SubscriptionRegistry has key {
    id: UID,
    subscriptions: Table<address, Subscription>,
    user_deployments: Table<address, u64>,
    total_subscribers: u64,
    total_revenue: u64,
}
```

#### Subscription
```move
public struct Subscription has store {
    user: address,
    tier: u8,                    // 0=Free, 1=Starter, 2=Growth
    expires_at: u64,            // Timestamp
    deployments_used: u64,      // Current month usage
    deployments_limit: u64,     // Monthly limit
    auto_renew: bool,
    created_at: u64,
    last_payment: u64,
}
```

### Constants
- `TIER_FREE: u8 = 0` (Free tier)
- `TIER_STARTER: u8 = 1` ($10/month - 10 deployments)
- `TIER_GROWTH: u8 = 2` ($50/month - 100 deployments)

### Functions

#### init_registry
**Type:** `public fun`
**Description:** Initializes the subscription registry
```typescript
{
  target: `${packageId}::subscription_manager::init_registry`,
  arguments: [ctx] // &mut TxContext
}
```

#### subscribe<T>
**Type:** `public entry fun`
**Description:** Creates a new subscription
```typescript
{
  target: `${packageId}::subscription_manager::subscribe`,
  typeArguments: [PAYMENT_TOKEN_TYPE],
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

#### renew_subscription<T>
**Type:** `public entry fun`
**Description:** Renews an existing subscription
```typescript
{
  target: `${packageId}::subscription_manager::renew_subscription`,
  typeArguments: [PAYMENT_TOKEN_TYPE],
  arguments: [
    registry,          // &mut SubscriptionRegistry
    payment,          // Coin<T>
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

#### record_deployment
**Type:** `public entry fun`
**Description:** Records a deployment for usage tracking
```typescript
{
  target: `${packageId}::subscription_manager::record_deployment`,
  arguments: [
    registry,          // &mut SubscriptionRegistry
    user,             // address
    ctx               // &mut TxContext
  ]
}
```

#### upgrade_tier<T>
**Type:** `public entry fun`
**Description:** Upgrades user's subscription tier
```typescript
{
  target: `${packageId}::subscription_manager::upgrade_tier`,
  typeArguments: [PAYMENT_TOKEN_TYPE],
  arguments: [
    registry,          // &mut SubscriptionRegistry
    payment,          // Coin<T>
    new_tier,         // u8
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

#### cancel_subscription
**Type:** `public entry fun`
**Description:** Cancels a subscription (disables auto-renew)
```typescript
{
  target: `${packageId}::subscription_manager::cancel_subscription`,
  arguments: [
    registry,          // &mut SubscriptionRegistry
    ctx               // &mut TxContext
  ]
}
```

#### get_subscription_info
**Type:** `public fun`
**Description:** Gets subscription information for a user
```typescript
// This is a view function - use sui_devInspectTransactionBlock
{
  target: `${packageId}::subscription_manager::get_subscription_info`,
  arguments: [
    registry,          // &SubscriptionRegistry
    user_address      // address
  ]
}
```

#### get_tier_pricing
**Type:** `public fun`
**Description:** Gets pricing information for a tier
```typescript
{
  target: `${packageId}::subscription_manager::get_tier_pricing`,
  arguments: [
    tier              // u8
  ]
}
```

---

## 3. Deployment Registry Module

**Module:** `avenox::deployment_registry`

### Data Structures

#### DeploymentRegistry
```move
public struct DeploymentRegistry has key {
    id: UID,
    deployments: Table<ID, DeploymentRecord>,
    user_deployments: Table<address, vector<ID>>,
    total_deployments: u64,
    treasury_address: address,
}
```

#### DeploymentRecord
```move
public struct DeploymentRecord has store {
    deployment_id: ID,
    user: address,
    repo_url: String,
    commit_hash: String,
    branch: String,
    walrus_site_id: String,
    usdc_paid: u64,
    estimated_wal: u64,
    actual_wal_used: u64,
    created_at: u64,
    deployed_at: u64,
    status: u8,                    // 0=Pending, 1=Processing, 2=Deployed, 3=Failed
    build_command: String,
    output_dir: String,
    version: String,
    error_message: String,
    environment: String,
    deployment_type: u8,           // 0=Regular, 1=Staging, 2=Rollback
    parent_deployment_id: Option<ID>,
    metadata: String,
}
```

#### DeploymentRequest
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

### Constants
- `STATUS_PENDING: u8 = 0`
- `STATUS_PROCESSING: u8 = 1`
- `STATUS_DEPLOYED: u8 = 2`
- `STATUS_FAILED: u8 = 3`

### Functions

#### init_registry
**Type:** `public fun`
**Description:** Initializes the deployment registry
```typescript
{
  target: `${packageId}::deployment_registry::init_registry`,
  arguments: [
    treasury_address,  // address
    ctx               // &mut TxContext
  ]
}
```

#### request_deployment<T>
**Type:** `public entry fun`
**Description:** Requests a new deployment
```typescript
{
  target: `${packageId}::deployment_registry::request_deployment`,
  typeArguments: [PAYMENT_TOKEN_TYPE],
  arguments: [
    registry,          // &mut DeploymentRegistry
    subscription_registry, // &mut SubscriptionRegistry
    payment,          // Coin<T>
    repo_url,         // String
    branch,           // String
    commit_hash,      // String
    build_command,    // String
    output_dir,       // String
    environment,      // String
    estimated_wal,    // u64
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

#### mark_processing
**Type:** `public entry fun`
**Description:** Marks a deployment as processing (admin only)
```typescript
{
  target: `${packageId}::deployment_registry::mark_processing`,
  arguments: [
    registry,          // &mut DeploymentRegistry
    deployment_id,     // ID
    ctx               // &mut TxContext
  ]
}
```

#### mark_deployed
**Type:** `public entry fun`
**Description:** Marks a deployment as completed
```typescript
{
  target: `${packageId}::deployment_registry::mark_deployed`,
  arguments: [
    registry,          // &mut DeploymentRegistry
    deployment_id,     // ID
    walrus_site_id,   // String
    actual_wal_used,  // u64
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

#### mark_failed
**Type:** `public entry fun`
**Description:** Marks a deployment as failed
```typescript
{
  target: `${packageId}::deployment_registry::mark_failed`,
  arguments: [
    registry,          // &mut DeploymentRegistry
    deployment_id,     // ID
    error_message,    // String
    ctx               // &mut TxContext
  ]
}
```

#### request_rollback_deployment<T>
**Type:** `public entry fun`
**Description:** Requests a rollback to a previous deployment
```typescript
{
  target: `${packageId}::deployment_registry::request_rollback_deployment`,
  typeArguments: [PAYMENT_TOKEN_TYPE],
  arguments: [
    registry,          // &mut DeploymentRegistry
    payment,          // Coin<T>
    parent_deployment_id, // ID
    clock,            // &Clock
    ctx               // &mut TxContext
  ]
}
```

#### get_deployment_info
**Type:** `public fun`
**Description:** Gets deployment information
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

#### get_user_deployments
**Type:** `public fun`
**Description:** Gets all deployments for a user
```typescript
{
  target: `${packageId}::deployment_registry::get_user_deployments`,
  arguments: [
    registry,          // &DeploymentRegistry
    user_address      // address
  ]
}
```

---

## Error Codes

### Payment Processor
- `E_INSUFFICIENT_BALANCE: 2001` - Insufficient balance for operation

### Subscription Manager
- `E_INSUFFICIENT_PAYMENT: 3001` - Payment amount insufficient for tier
- `E_SUBSCRIPTION_NOT_FOUND: 3002` - No subscription found for user
- `E_ALREADY_SUBSCRIBED: 3003` - User already has active subscription
- `E_INVALID_TIER: 3005` - Invalid subscription tier specified

### Deployment Registry
- `E_INSUFFICIENT_PAYMENT: 1001` - Insufficient payment for deployment
- `E_UNAUTHORIZED: 1003` - Unauthorized operation
- `E_INVALID_STATUS: 1004` - Invalid status transition

---

## Events

### PaymentProcessed
```move
public struct PaymentProcessed has copy, drop {
    user: address,
    usdc_amount: u64,
    wal_amount: u64,
    swap_rate: u64,
    timestamp: u64,
}
```

### SubscriptionCreated
```move
public struct SubscriptionCreated has copy, drop {
    user: address,
    tier: u8,
    expires_at: u64,
    amount_paid: u64,
}
```

### DeploymentRequested
```move
public struct DeploymentRequested has copy, drop {
    deployment_id: ID,
    user: address,
    repo_url: String,
    estimated_wal: u64,
}
```

### DeploymentCompleted
```move
public struct DeploymentCompleted has copy, drop {
    deployment_id: ID,
    user: address,
    walrus_site_id: String,
    actual_wal_used: u64,
}
```

---

## Integration Notes

### Required Dependencies
```json
{
  "@mysten/sui": "latest",
  "@mysten/dapp-kit": "latest"
}
```

### Token Type Arguments
- **USDC Testnet:** `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`
- **WAL Token:** Custom token type (to be deployed)

### Clock Object
- **Testnet Clock:** `0x6`

### Common Patterns
1. All entry functions require `&mut TxContext`
2. Payment functions require appropriate `Coin<T>` objects
3. Time-based functions require `&Clock` object
4. View functions can be called with `sui_devInspectTransactionBlock`

### Gas Estimation
- Simple transactions: ~1-2M gas units
- Complex transactions with multiple operations: ~3-5M gas units
- Deployment requests: ~2-3M gas units