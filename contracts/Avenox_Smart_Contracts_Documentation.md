# Avenox Smart Contracts

## What is this?

So I built this decentralized deployment platform on Sui that lets developers deploy their web apps using crypto payments. It's basically like Vercel but with blockchain payments and subscriptions. The whole thing runs on 4 smart contracts that handle payments, deployments, subscriptions, and now Cetus DEX integration.

**Latest Deployment (Dec 2024):**

- Package ID: `0x155be5fad0cd3a1cda64073eaa32481dfc951396e63bad8b2bcc20feb8198438`
- Network: Sui Testnet
- Gas Used: ~0.135 SUI

```text
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Deployment         │    │  Payment            │    │  Subscription       │
│  Registry           │◄──►│  Processor          │◄──►│  Manager            │
│                     │    │                     │    │                     │
│ • Track deployments │    │ • Handle USDC       │    │ • Manage tiers      │
│ • Store metadata    │    │ • Convert to WAL    │    │ • Usage tracking    │
│ • Version control   │    │ • Treasury mgmt     │    │ • Auto-renewal      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## How it works

Basically there are 4 main contracts:

1. **Deployment Registry** - tracks all the deployments, versions, rollbacks etc
2. **Payment Processor** - handles USDC payments, basic swap logic
3. **Payment Processor Cetus** - NEW! Advanced DEX integration for automated USDC→WAL swaps
4. **Subscription Manager** - manages user tiers, usage limits, billing

They all talk to each other to make the whole deployment flow work.

## 1. Deployment Registry

This is where all the deployment magic happens. When someone wants to deploy their app, this contract handles the whole lifecycle.

### Deployment States

Each deployment goes through these states:

- `PENDING` - just submitted, waiting to be picked up
- `PROCESSING` - backend is building it
- `DEPLOYED` - live on Walrus!
- `FAILED` - something went wrong

### Main Registry Structure

```move
public struct DeploymentRegistry has key {
    id: UID,
    user_deployments: Table<address, vector<ID>>,  // who deployed what
    deployments: Table<ID, DeploymentRecord>,      // all the deployment data
    total_deployments: u64,                        // stats
    total_usdc_collected: u64,                     // revenue
    treasury_address: address,                     // where money goes
    min_payment_usdc: u64,                        // 5 USDC minimum
    platform_fee_bps: u64,                       // 20% platform fee
}
```

Each deployment record stores everything:

```move
public struct DeploymentRecord has copy, drop, store {
    deployment_id: ID,
    user: address,
    repo_url: String,           // GitHub repo
    commit_hash: String,        // exact commit
    branch: String,             // git branch
    walrus_site_id: String,     // final URL
    usdc_paid: u64,            // how much they paid
    estimated_wal: u64,        // estimated WAL needed
    actual_wal_used: u64,      // actual WAL used
    created_at: u64,           // when requested
    deployed_at: u64,          // when completed
    status: u8,                // current state
    build_command: String,     // npm run build, etc
    output_dir: String,        // dist/, build/, etc
    version: u64,              // auto-incremented
    error_message: String,     // if it failed
    environment: String,       // prod, staging, etc
    deployment_type: u8,       // normal, rollback
    parent_deployment_id: Option<ID>, // for rollbacks
    metadata: String,          // extra stuff as JSON
}
```

### Key Functions

**`request_deployment<T>()`** - This is the main one:

- Takes USDC payment (min 5 USDC)
- Creates deployment record
- Auto-increments version numbers
- Sends payment to treasury
- Emits events for the backend to pick up

**Backend functions** (these are called by our deployment service):

- `mark_processing()` - "we're building it"
- `mark_deployed()` - "it's live!"
- `mark_failed()` - "something broke"

**`request_rollback_deployment<T>()`** - rollback to previous version:

- Copies settings from old deployment
- Creates new deployment marked as rollback
- Keeps track of parent-child relationships

### Version Management

Each repo gets auto-incrementing versions per user. So if you deploy the same repo 3 times, you get versions 1, 2, 3. Makes rollbacks easy.

### Events

- `DeploymentCreated` - new deployment requested
- `DeploymentCompleted` - deployment succeeded
- `DeploymentFailed` - deployment failed

## 2. Payment Processors

I built two payment processors - a basic one and an advanced Cetus DEX integration.

### Basic Payment Processor (`payment_processor.move`)

This handles basic USDC collection and mock swaps. Uses generics so it works with any token types:

```move
public struct PaymentProcessor<phantom U, phantom W> has key
```

- `U` = USDC token type
- `W` = WAL token type

Main structure:

```move
public struct PaymentProcessor<phantom U, phantom W> has key {
    id: UID,
    treasury_address: address,
    usdc_buffer: Balance<U>,           // collects USDC
    wal_buffer: Balance<W>,            // stores WAL
    auto_swap_threshold: u64,          // 100 USDC trigger
    total_usdc_processed: u64,         // stats
    total_wal_distributed: u64,
    slippage_tolerance_bps: u64,       // 3% default
    pool_address: address,             // DEX pool
}
```

How it works:

1. `process_payment<U, W>()` - accepts USDC, adds to buffer
2. When buffer hits 100 USDC, triggers auto-swap
3. `simulate_swap<U, W>()` - for demo purposes, just transfers USDC to treasury

### NEW: Cetus Payment Processor (`payment_processor_cetus.move`)

This is the real deal - integrates with Cetus DEX for actual USDC→WAL swaps.

**Object IDs from latest deployment:**

- SwapRouter: `0xae47ac210c3f27a723db432f7a48f3e5d89bf72b5098d4949003bd1c93157181`

#### Key Features

**Pool Management:**

- `add_pool_config()` - configure Cetus pools
- `update_pool_config()` - enable/disable pools
- Multiple pool support for different fee tiers

**Smart Swapping:**

- `get_swap_quote()` - get price quotes before swapping
- `swap_through_cetus()` - execute swaps with slippage protection
- `batch_swap()` - process multiple payments efficiently
- Auto-swap when buffer reaches threshold

**Safety Features:**

- Configurable slippage tolerance (default 3%)
- Price impact calculation
- Emergency withdrawal functions
- Admin controls for all parameters

**Pool Configuration:**

```move
public struct PoolConfig has store, copy, drop {
    pool_address: address,
    fee_tier: u64,              // 100, 500, 2500, 10000 bps
    sqrt_price_limit: u128,
    is_active: bool,
    last_updated: u64
}
```

**Swap Records:**
Tracks every swap with full details - amount in/out, pool used, fees paid, success status, etc.

## 3. Subscription Manager

Handles the business model - user tiers, billing, usage tracking.

**Object ID:** `0xccf05bdcee9ba5fc1724cacbd762247e623bf60e62cbac6a771c83c0c1df5e22`

### Subscription Tiers

| Tier           | Price/Month | Deployments | Bandwidth | Features                                        |
| -------------- | ----------- | ----------- | --------- | ----------------------------------------------- |
| **Free**       | $0          | 3           | 100 MB    | Basic deployment                                |
| **Starter**    | $10         | 10          | 1 GB      | Custom domains, 3 team members, analytics       |
| **Growth**     | $50         | 100         | 10 GB     | Priority builds, SLA guarantee, 10 team members |
| **Enterprise** | $200        | Unlimited   | Unlimited | Dedicated support, 999 team members             |

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

Each user subscription:

```move
public struct Subscription has copy, drop, store {
    user: address,
    tier: u8,
    start_date: u64,
    end_date: u64,
    deployments_used: u64,               // current month usage
    bandwidth_used: u64,
    auto_renew: bool,
    payment_history: vector<PaymentRecord>, // audit trail
    total_spent: u64,                    // lifetime spending
}
```

### Usage Tracking

Each user gets a usage tracker:

```move
public struct UsageTracker has key {
    id: UID,
    user: address,
    current_month_deployments: u64,
    current_month_bandwidth: u64,
    deployment_history: Table<ID, DeploymentUsage>,
    last_reset: u64,
}
```

### Key Functions

**Subscription stuff:**

- `subscribe<T>()` - create new subscription
- `renew_subscription<T>()` - extend subscription
- `upgrade_tier<T>()` - upgrade with prorated payment
- `cancel_subscription()` - disable auto-renewal

**Usage stuff:**

- `can_deploy()` - check if user can deploy
- `record_deployment()` - track usage
- Auto-enforcement of limits

### Feature Flags

Each tier gets different features:

```move
public struct FeatureFlags has copy, drop, store {
    custom_domains: bool,
    team_members: u64,
    analytics: bool,
    priority_builds: bool,
    sla_guarantee: bool,
    dedicated_support: bool,
}
```

### Billing

- 30-day billing cycles
- Prorated upgrades
- Payment history tracking
- Auto-renewal
- Revenue analytics

## How Everything Works Together

### Complete Flow

1. **Check if user can deploy:**

   ```move
   subscription_manager::can_deploy(registry, user, clock)
   ```

2. **Process payment:**

   ```move
   payment_processor::process_payment(...)
   // OR for Cetus integration:
   payment_processor_cetus::swap_through_cetus(...)
   ```

3. **Request deployment:**

   ```move
   deployment_registry::request_deployment(...)
   ```

4. **Backend picks it up:**

   - `mark_processing()` - "building..."
   - Build the app
   - `mark_deployed()` or `mark_failed()`

5. **Track usage:**

   ```move
   subscription_manager::record_deployment(...)
   ```

### Money Flow

1. Users pay USDC for deployments/subscriptions
2. USDC goes to treasury
3. Cetus processor automatically swaps USDC→WAL
4. WAL funds actual Walrus storage costs

## Security Stuff

### Access Control

- Admin capabilities for privileged operations
- User authorization on all operations
- Backend processor capability

### Payment Security

- Minimum payment validation (prevents dust attacks)
- Balance verification
- Emergency withdrawal functions

### Data Integrity

- Immutable deployment records
- Auto-versioning
- Complete audit trails

## Gas Optimization

### Efficient Stuff

- Table usage for O(1) lookups
- Vector operations for batch processing
- Events instead of on-chain storage
- Batch operations where possible

## What Makes This Cool

### 1. Complete Web3 Deployment Pipeline

GitHub repo → crypto payment → live website. All on-chain.

### 2. Subscription Business Model

Tiered pricing, usage tracking, auto-billing. Like SaaS but decentralized.

### 3. DeFi Integration

Actual DEX integration with Cetus for USDC→WAL swaps. Not just mock functions.

### 4. Developer Experience

- Version management
- One-click rollbacks
- Error handling
- Complete audit trails

### 5. Scalability

- Gas-efficient operations
- Batch processing
- Modular architecture

## Technical Innovation

### Blockchain Stuff

- Sui Move language with object-centric model
- Generic types for token flexibility
- Event-driven architecture

### Business Model

- Crypto-native subscriptions
- Real-time usage tracking
- Automated treasury management
- DeFi integration for token swaps

### Developer Tools

- Git-native workflow
- One-click rollbacks
- Environment management
- Version control

---

## Deployed Contract Info

**Package ID:** `0x155be5fad0cd3a1cda64073eaa32481dfc951396e63bad8b2bcc20feb8198438`

**Shared Objects:**

- DeploymentRegistry: `0x853aad16cf254d6049ec8191af960053d43d4bdbd6073b0ff85b26718e399f1a`
- SwapRouter: `0xae47ac210c3f27a723db432f7a48f3e5d89bf72b5098d4949003bd1c93157181`
- SubscriptionRegistry: `0xccf05bdcee9ba5fc1724cacbd762247e623bf60e62cbac6a771c83c0c1df5e22`

**Admin Objects:**

- DeploymentProcessor: `0x7b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b2b1b7b3b`
- ProcessorAdmin: `0x0000000000000000000000000000000000000000000000000000000000005678`

That's basically it. A complete decentralized deployment platform with crypto payments, subscriptions, and DeFi integration. Pretty cool stuff!
