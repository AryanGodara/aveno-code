module avenox::subscription_manager;

use std::string::{Self, String};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::table::{Self, Table};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// Constants
const SECONDS_IN_MONTH: u64 = 2592000000; // 30 days in ms
const E_INSUFFICIENT_PAYMENT: u64 = 3001;
const E_SUBSCRIPTION_NOT_FOUND: u64 = 3002;
const E_ALREADY_SUBSCRIBED: u64 = 3003;
const E_INVALID_TIER: u64 = 3005;

// Subscription tiers
const TIER_FREE: u8 = 0;
const TIER_STARTER: u8 = 1; // $10/month - 10 deployments
const TIER_GROWTH: u8 = 2; // $50/month - 100 deployments

/// Main subscription registry
public struct SubscriptionRegistry has key {
    id: UID,
    /// Maps user address to their subscription
    subscriptions: Table<address, Subscription>,
    /// Total revenue collected
    total_revenue: u64,
    /// Total active subscriptions per tier
    active_subscriptions: vector<u64>,
    /// Treasury address
    treasury: address,
    /// Tier prices in USDC (6 decimals)
    tier_prices: vector<u64>,
    /// Deployment limits per tier
    deployment_limits: vector<u64>,
    /// Bandwidth limits per tier (in MB)
    bandwidth_limits: vector<u64>,
}

/// Individual subscription record
public struct Subscription has copy, drop, store {
    user: address,
    tier: u8,
    start_date: u64,
    end_date: u64,
    deployments_used: u64,
    bandwidth_used: u64,
    auto_renew: bool,
    payment_history: vector<PaymentRecord>,
    total_spent: u64,
}

/// Payment record for audit trail
public struct PaymentRecord has copy, drop, store {
    amount: u64,
    timestamp: u64,
    tier: u8,
    transaction_id: ID,
}

/// Usage tracking for metering
public struct UsageTracker has key {
    id: UID,
    user: address,
    current_month_deployments: u64,
    current_month_bandwidth: u64,
    deployment_history: Table<ID, DeploymentUsage>,
    last_reset: u64,
}

public struct DeploymentUsage has copy, drop, store {
    deployment_id: ID,
    timestamp: u64,
    bandwidth_used: u64,
    storage_used: u64,
    build_time_ms: u64,
}

/// Feature flags for different tiers
public struct FeatureFlags has copy, drop, store {
    custom_domains: bool,
    team_members: u64,
    analytics: bool,
    priority_builds: bool,
    sla_guarantee: bool,
    dedicated_support: bool,
}

// Events
public struct SubscriptionCreated has copy, drop {
    user: address,
    tier: u8,
    amount: u64,
    end_date: u64,
}

public struct SubscriptionRenewed has copy, drop {
    user: address,
    tier: u8,
    amount: u64,
    new_end_date: u64,
}

public struct SubscriptionCancelled has copy, drop {
    user: address,
    tier: u8,
    timestamp: u64,
}

public struct UsageExceeded has copy, drop {
    user: address,
    limit_type: String,
    current_usage: u64,
    limit: u64,
}

fun init(ctx: &mut TxContext) {
    let registry = SubscriptionRegistry {
        id: object::new(ctx),
        subscriptions: table::new(ctx),
        total_revenue: 0,
        active_subscriptions: vector[0, 0, 0, 0],
        treasury: @0x1234, // Replace with actual treasury
        tier_prices: vector[
            0, // Free
            10_000_000, // $10 USDC (6 decimals)
            50_000_000, // $50 USDC
            200_000_000, // $200 USDC
        ],
        deployment_limits: vector[
            3, // Free: 3 deployments
            10, // Starter: 10 deployments
            100, // Growth: 100 deployments
            9999, // Enterprise: unlimited
        ],
        bandwidth_limits: vector[
            100, // Free: 100 MB
            1000, // Starter: 1 GB
            10000, // Growth: 10 GB
            99999, // Enterprise: unlimited
        ],
    };

    transfer::share_object(registry);
}

/// Subscribe to a paid tier - accepts any coin type T (will be USDC in production)
public entry fun subscribe<T>(
    registry: &mut SubscriptionRegistry,
    payment: Coin<T>,
    tier: u8,
    auto_renew: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(tier > 0 && tier <= 3, E_INVALID_TIER);

    let user = tx_context::sender(ctx);
    assert!(!table::contains(&registry.subscriptions, user), E_ALREADY_SUBSCRIBED);

    let payment_amount = coin::value(&payment);
    let required_amount = *vector::borrow(&registry.tier_prices, (tier as u64));
    assert!(payment_amount >= required_amount, E_INSUFFICIENT_PAYMENT);

    let current_time = clock::timestamp_ms(clock);
    let end_date = current_time + SECONDS_IN_MONTH;

    let payment_record = PaymentRecord {
        amount: payment_amount,
        timestamp: current_time,
        tier,
        transaction_id: object::id_from_address(@0x0), // Placeholder
    };

    let subscription = Subscription {
        user,
        tier,
        start_date: current_time,
        end_date,
        deployments_used: 0,
        bandwidth_used: 0,
        auto_renew,
        payment_history: vector[payment_record],
        total_spent: payment_amount,
    };

    table::add(&mut registry.subscriptions, user, subscription);

    // Update active subscriptions count
    let tier_count = vector::borrow_mut(&mut registry.active_subscriptions, (tier as u64));
    *tier_count = *tier_count + 1;

    registry.total_revenue = registry.total_revenue + payment_amount;

    // Transfer payment to treasury
    transfer::public_transfer(payment, registry.treasury);

    event::emit(SubscriptionCreated {
        user,
        tier,
        amount: payment_amount,
        end_date,
    });

    // Create usage tracker for the user
    let tracker = UsageTracker {
        id: object::new(ctx),
        user,
        current_month_deployments: 0,
        current_month_bandwidth: 0,
        deployment_history: table::new(ctx),
        last_reset: current_time,
    };

    transfer::transfer(tracker, user);
}

/// Renew subscription
public entry fun renew_subscription<T>(
    registry: &mut SubscriptionRegistry,
    payment: Coin<T>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = tx_context::sender(ctx);
    assert!(table::contains(&registry.subscriptions, user), E_SUBSCRIPTION_NOT_FOUND);

    let subscription = table::borrow_mut(&mut registry.subscriptions, user);
    let tier = subscription.tier;

    let payment_amount = coin::value(&payment);
    let required_amount = *vector::borrow(&registry.tier_prices, (tier as u64));
    assert!(payment_amount >= required_amount, E_INSUFFICIENT_PAYMENT);

    let current_time = clock::timestamp_ms(clock);

    // Extend subscription
    if (current_time > subscription.end_date) {
        // Subscription expired, restart from now
        subscription.end_date = current_time + SECONDS_IN_MONTH;
    } else {
        // Still active, extend from current end date
        subscription.end_date = subscription.end_date + SECONDS_IN_MONTH;
    };

    // Reset monthly limits
    subscription.deployments_used = 0;
    subscription.bandwidth_used = 0;

    // Add payment record
    let payment_record = PaymentRecord {
        amount: payment_amount,
        timestamp: current_time,
        tier,
        transaction_id: object::id_from_address(@0x0),
    };
    vector::push_back(&mut subscription.payment_history, payment_record);
    subscription.total_spent = subscription.total_spent + payment_amount;

    registry.total_revenue = registry.total_revenue + payment_amount;

    transfer::public_transfer(payment, registry.treasury);

    event::emit(SubscriptionRenewed {
        user,
        tier,
        amount: payment_amount,
        new_end_date: subscription.end_date,
    });
}

/// Check if user can deploy based on subscription
public fun can_deploy(registry: &SubscriptionRegistry, user: address, clock: &Clock): bool {
    if (!table::contains(&registry.subscriptions, user)) {
        // Free tier users can always attempt (limits checked elsewhere)
        return true
    };

    let subscription = table::borrow(&registry.subscriptions, user);
    let current_time = clock::timestamp_ms(clock);

    // Check if subscription is active
    if (current_time > subscription.end_date) {
        return false
    };

    // Check deployment limits
    let limit = *vector::borrow(&registry.deployment_limits, (subscription.tier as u64));
    subscription.deployments_used < limit
}

/// Record a deployment for usage tracking
public entry fun record_deployment(
    registry: &mut SubscriptionRegistry,
    tracker: &mut UsageTracker,
    deployment_id: ID,
    bandwidth_mb: u64,
    storage_mb: u64,
    build_time_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = tx_context::sender(ctx);

    // Update subscription usage if user has one
    if (table::contains(&registry.subscriptions, user)) {
        let subscription = table::borrow_mut(&mut registry.subscriptions, user);
        subscription.deployments_used = subscription.deployments_used + 1;
        subscription.bandwidth_used = subscription.bandwidth_used + bandwidth_mb;

        // Check limits and emit events if exceeded
        let deployment_limit =
            *vector::borrow(&registry.deployment_limits, (subscription.tier as u64));
        let bandwidth_limit =
            *vector::borrow(&registry.bandwidth_limits, (subscription.tier as u64));

        if (subscription.deployments_used > deployment_limit) {
            event::emit(UsageExceeded {
                user,
                limit_type: string::utf8(b"deployments"),
                current_usage: subscription.deployments_used,
                limit: deployment_limit,
            });
        };

        if (subscription.bandwidth_used > bandwidth_limit) {
            event::emit(UsageExceeded {
                user,
                limit_type: string::utf8(b"bandwidth"),
                current_usage: subscription.bandwidth_used,
                limit: bandwidth_limit,
            });
        };
    };

    // Update usage tracker
    let usage = DeploymentUsage {
        deployment_id,
        timestamp: clock::timestamp_ms(clock),
        bandwidth_used: bandwidth_mb,
        storage_used: storage_mb,
        build_time_ms,
    };

    table::add(&mut tracker.deployment_history, deployment_id, usage);
    tracker.current_month_deployments = tracker.current_month_deployments + 1;
    tracker.current_month_bandwidth = tracker.current_month_bandwidth + bandwidth_mb;
}

/// Upgrade subscription tier
public entry fun upgrade_tier<T>(
    registry: &mut SubscriptionRegistry,
    payment: Coin<T>,
    new_tier: u8,
    _clock: &Clock,
    _ctx: &mut TxContext,
) {
    assert!(new_tier > 0 && new_tier <= 3, E_INVALID_TIER);

    let user = tx_context::sender(_ctx);
    assert!(table::contains(&registry.subscriptions, user), E_SUBSCRIPTION_NOT_FOUND);

    let subscription = table::borrow_mut(&mut registry.subscriptions, user);
    let old_tier = subscription.tier;
    assert!(new_tier > old_tier, E_INVALID_TIER); // Can only upgrade

    // Calculate prorated payment
    let new_price = *vector::borrow(&registry.tier_prices, (new_tier as u64));
    let old_price = *vector::borrow(&registry.tier_prices, (old_tier as u64));
    let price_diff = new_price - old_price;

    let payment_amount = coin::value(&payment);
    assert!(payment_amount >= price_diff, E_INSUFFICIENT_PAYMENT);

    // Update tier counts
    let old_tier_count = vector::borrow_mut(&mut registry.active_subscriptions, (old_tier as u64));
    *old_tier_count = *old_tier_count - 1;

    let new_tier_count = vector::borrow_mut(&mut registry.active_subscriptions, (new_tier as u64));
    *new_tier_count = *new_tier_count + 1;

    // Update subscription
    subscription.tier = new_tier;

    transfer::public_transfer(payment, registry.treasury);
}

/// Cancel subscription
public entry fun cancel_subscription(
    registry: &mut SubscriptionRegistry,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = tx_context::sender(ctx);
    assert!(table::contains(&registry.subscriptions, user), E_SUBSCRIPTION_NOT_FOUND);

    let subscription = table::borrow_mut(&mut registry.subscriptions, user);
    subscription.auto_renew = false;

    event::emit(SubscriptionCancelled {
        user,
        tier: subscription.tier,
        timestamp: clock::timestamp_ms(clock),
    });
}

/// Get feature flags for a tier
public fun get_features(tier: u8): FeatureFlags {
    if (tier == TIER_FREE) {
        FeatureFlags {
            custom_domains: false,
            team_members: 0,
            analytics: false,
            priority_builds: false,
            sla_guarantee: false,
            dedicated_support: false,
        }
    } else if (tier == TIER_STARTER) {
        FeatureFlags {
            custom_domains: true,
            team_members: 3,
            analytics: true,
            priority_builds: false,
            sla_guarantee: false,
            dedicated_support: false,
        }
    } else if (tier == TIER_GROWTH) {
        FeatureFlags {
            custom_domains: true,
            team_members: 10,
            analytics: true,
            priority_builds: true,
            sla_guarantee: true,
            dedicated_support: false,
        }
    } else {
        FeatureFlags {
            custom_domains: true,
            team_members: 999,
            analytics: true,
            priority_builds: true,
            sla_guarantee: true,
            dedicated_support: true,
        }
    }
}

// View functions
public fun get_subscription(registry: &SubscriptionRegistry, user: address): &Subscription {
    table::borrow(&registry.subscriptions, user)
}

public fun has_active_subscription(
    registry: &SubscriptionRegistry,
    user: address,
    clock: &Clock,
): bool {
    if (!table::contains(&registry.subscriptions, user)) {
        return false
    };

    let subscription = table::borrow(&registry.subscriptions, user);
    clock::timestamp_ms(clock) <= subscription.end_date
}

public fun get_total_revenue(registry: &SubscriptionRegistry): u64 {
    registry.total_revenue
}
