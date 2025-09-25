module avenox::payment_processor;

use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use std::vector;

// Error codes
const E_INSUFFICIENT_BALANCE: u64 = 2001;

/// Payment processor that handles USDC collection and WAL conversion
/// Uses generic types U for USDC and W for WAL
public struct PaymentProcessor<phantom U, phantom W> has key {
    id: UID,
    /// Treasury that receives tokens for deployments
    treasury_address: address,
    /// Accumulated USDC before swap
    usdc_buffer: Balance<U>,
    /// Accumulated WAL after swaps
    wal_buffer: Balance<W>,
    /// Minimum USDC to trigger automatic swap
    auto_swap_threshold: u64,
    /// Total USDC processed
    total_usdc_processed: u64,
    /// Total WAL distributed
    total_wal_distributed: u64,
    /// Slippage tolerance in basis points (100 = 1%)
    slippage_tolerance_bps: u64,
    /// DEX pool address for USDC/WAL pair
    pool_address: address,
}

/// Admin capability for managing the processor
public struct ProcessorAdmin has key, store {
    id: UID,
}

/// Receipt for payment processing
public struct PaymentReceipt has copy, drop, store {
    user: address,
    usdc_amount: u64,
    expected_wal: u64,
    actual_wal: u64,
    timestamp: u64,
    swap_rate: u64, // WAL per USDC (with 6 decimal precision)
}

// Events
public struct PaymentProcessed has copy, drop {
    user: address,
    usdc_amount: u64,
    deployment_id: vector<u8>,
    timestamp: u64,
}

public struct SwapExecuted has copy, drop {
    usdc_amount: u64,
    wal_received: u64,
    swap_rate: u64,
    timestamp: u64,
}

public struct WALTransferred has copy, drop {
    recipient: address,
    amount: u64,
    purpose: vector<u8>,
    timestamp: u64,
}

/// Initialize payment processor for specific USDC and WAL types
public fun init_processor<U, W>(ctx: &mut TxContext): ProcessorAdmin {
    let processor = PaymentProcessor<U, W> {
        id: object::new(ctx),
        treasury_address: @0x1234, // Replace with actual treasury
        usdc_buffer: balance::zero<U>(),
        wal_buffer: balance::zero<W>(),
        auto_swap_threshold: 100_000_000, // 100 USDC
        total_usdc_processed: 0,
        total_wal_distributed: 0,
        slippage_tolerance_bps: 300, // 3% slippage
        pool_address: @0x5678, // Replace with actual DEX pool address
    };

    let admin = ProcessorAdmin {
        id: object::new(ctx),
    };

    transfer::share_object(processor);
    admin
}

/// Process payment - accepts USDC type U
public entry fun process_payment<U, W>(
    processor: &mut PaymentProcessor<U, W>,
    payment: Coin<U>,
    _expected_wal: u64,
    deployment_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = tx_context::sender(ctx);
    let usdc_amount = coin::value(&payment);

    // Add USDC to buffer
    balance::join(&mut processor.usdc_buffer, coin::into_balance(payment));
    processor.total_usdc_processed = processor.total_usdc_processed + usdc_amount;

    // Check if we should trigger a swap
    if (balance::value(&processor.usdc_buffer) >= processor.auto_swap_threshold) {};

    event::emit(PaymentProcessed {
        user,
        usdc_amount,
        deployment_id,
        timestamp: clock::timestamp_ms(clock),
    });
}

/// Simulate swap from USDC to WAL (for hackathon demo)
/// In production, integrate with actual DEX
public entry fun simulate_swap<U, W>(
    processor: &mut PaymentProcessor<U, W>,
    mock_wal: Coin<W>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let swap_amount = balance::value(&processor.usdc_buffer);
    assert!(swap_amount > 0, E_INSUFFICIENT_BALANCE);

    // Add mock WAL to buffer
    let wal_amount = coin::value(&mock_wal);
    balance::join(&mut processor.wal_buffer, coin::into_balance(mock_wal));

    // Transfer USDC to treasury
    let usdc_to_transfer = coin::from_balance(
        balance::split(&mut processor.usdc_buffer, swap_amount),
        ctx,
    );
    transfer::public_transfer(usdc_to_transfer, processor.treasury_address);

    event::emit(SwapExecuted {
        usdc_amount: swap_amount,
        wal_received: wal_amount,
        swap_rate: (wal_amount * 1_000_000) / swap_amount, // Calculate rate with precision
        timestamp: clock::timestamp_ms(clock),
    });
}

/// Transfer WAL tokens to deployment treasury
public entry fun transfer_wal_to_treasury<U, W>(
    processor: &mut PaymentProcessor<U, W>,
    _admin: &ProcessorAdmin,
    amount: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(balance::value(&processor.wal_buffer) >= amount, E_INSUFFICIENT_BALANCE);

    let wal_to_transfer = coin::from_balance(
        balance::split(&mut processor.wal_buffer, amount),
        ctx,
    );

    transfer::public_transfer(wal_to_transfer, processor.treasury_address);
    processor.total_wal_distributed = processor.total_wal_distributed + amount;

    event::emit(WALTransferred {
        recipient: processor.treasury_address,
        amount,
        purpose: b"deployment_funding",
        timestamp: clock::timestamp_ms(clock),
    });
}

/// Emergency function to withdraw stuck USDC funds
public entry fun emergency_withdraw_usdc<U, W>(
    processor: &mut PaymentProcessor<U, W>,
    _admin: &ProcessorAdmin,
    ctx: &mut TxContext,
) {
    let balance_amount = balance::value(&processor.usdc_buffer);
    assert!(balance_amount > 0, E_INSUFFICIENT_BALANCE);

    let usdc_coin = coin::from_balance(
        balance::split(&mut processor.usdc_buffer, balance_amount),
        ctx,
    );

    transfer::public_transfer(usdc_coin, tx_context::sender(ctx));
}

/// Update processor configuration
public entry fun update_config<U, W>(
    processor: &mut PaymentProcessor<U, W>,
    _admin: &ProcessorAdmin,
    new_threshold: u64,
    new_slippage: u64,
    new_treasury: address,
    _ctx: &mut TxContext,
) {
    processor.auto_swap_threshold = new_threshold;
    processor.slippage_tolerance_bps = new_slippage;
    processor.treasury_address = new_treasury;
}

/// Batch process multiple payments
public entry fun batch_process_payments<U, W>(
    processor: &mut PaymentProcessor<U, W>,
    mut payments: vector<Coin<U>>, // Made mutable
    deployment_ids: vector<vector<u8>>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = tx_context::sender(ctx);
    let mut i = 0;
    let mut total_amount = 0u64;

    while (i < vector::length(&payments)) {
        let payment = vector::pop_back(&mut payments);
        let amount = coin::value(&payment);
        total_amount = total_amount + amount;

        balance::join(&mut processor.usdc_buffer, coin::into_balance(payment));

        event::emit(PaymentProcessed {
            user,
            usdc_amount: amount,
            deployment_id: *vector::borrow(&deployment_ids, i),
            timestamp: clock::timestamp_ms(clock),
        });

        i = i + 1;
    };

    processor.total_usdc_processed = processor.total_usdc_processed + total_amount;
    vector::destroy_empty(payments);
}

// View functions
public fun get_processor_stats<U, W>(processor: &PaymentProcessor<U, W>): (u64, u64, u64, u64) {
    (
        processor.total_usdc_processed,
        processor.total_wal_distributed,
        balance::value(&processor.usdc_buffer),
        balance::value(&processor.wal_buffer),
    )
}

public fun get_treasury_address<U, W>(processor: &PaymentProcessor<U, W>): address {
    processor.treasury_address
}

public fun get_swap_threshold<U, W>(processor: &PaymentProcessor<U, W>): u64 {
    processor.auto_swap_threshold
}
