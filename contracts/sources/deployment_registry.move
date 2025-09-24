module avenox::deployment_registry;

use std::option::{Self, Option};
use std::string::{Self, String};
use std::vector;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::table::{Self, Table};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// Constants for deployment states
const STATUS_PENDING: u8 = 0;
const STATUS_PROCESSING: u8 = 1;
const STATUS_DEPLOYED: u8 = 2;
const STATUS_FAILED: u8 = 3;

// Error codes
const E_INSUFFICIENT_PAYMENT: u64 = 1001;
const E_UNAUTHORIZED: u64 = 1003;
const E_INVALID_STATUS: u64 = 1004;

/// Main registry that tracks all deployments across the platform
public struct DeploymentRegistry has key {
    id: UID,
    user_deployments: Table<address, vector<ID>>,
    deployments: Table<ID, DeploymentRecord>,
    total_deployments: u64,
    total_usdc_collected: u64,
    treasury_address: address,
    min_payment_usdc: u64,
    platform_fee_bps: u64,
}

/// Individual deployment record with extensive metadata
public struct DeploymentRecord has copy, drop, store {
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
    status: u8,
    build_command: String,
    output_dir: String,
    version: u64,
    error_message: String,
    environment: String,
    deployment_type: u8,
    parent_deployment_id: Option<ID>,
    metadata: String,
}

/// Deployment request object
public struct DeploymentRequest has key, store {
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

/// Backend processor capability
public struct DeploymentProcessor has key, store {
    id: UID,
    authorized_address: address,
}

// Events
public struct DeploymentCreated has copy, drop {
    deployment_id: ID,
    user: address,
    repo_url: String,
    usdc_paid: u64,
    timestamp: u64,
}

public struct DeploymentCompleted has copy, drop {
    deployment_id: ID,
    walrus_site_id: String,
    actual_wal_used: u64,
    timestamp: u64,
}

public struct DeploymentFailed has copy, drop {
    deployment_id: ID,
    error_message: String,
    timestamp: u64,
}

fun init(ctx: &mut TxContext) {
    let registry = DeploymentRegistry {
        id: object::new(ctx),
        user_deployments: table::new(ctx),
        deployments: table::new(ctx),
        total_deployments: 0,
        total_usdc_collected: 0,
        treasury_address: @0x1234, // Replace with actual treasury
        min_payment_usdc: 5_000_000, // 5 USDC (6 decimals)
        platform_fee_bps: 2000, // 20% platform fee
    };

    let processor = DeploymentProcessor {
        id: object::new(ctx),
        authorized_address: @0x5678, // Replace with backend address
    };

    transfer::share_object(registry);
    transfer::transfer(processor, @0x5678);
}

/// Request deployment with payment - generic type T for any coin type
/// When calling, T will be the USDC type: 0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC
public entry fun request_deployment<T>(
    registry: &mut DeploymentRegistry,
    payment: Coin<T>,
    repo_url: vector<u8>,
    branch: vector<u8>,
    commit_hash: vector<u8>,
    build_command: vector<u8>,
    output_dir: vector<u8>,
    estimated_wal: u64,
    environment: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = tx_context::sender(ctx);
    let payment_amount = coin::value(&payment);

    // Verify minimum payment
    assert!(payment_amount >= registry.min_payment_usdc, E_INSUFFICIENT_PAYMENT);

    // Create deployment record
    let deployment_id = object::new(ctx);
    let deployment_id_copy = object::uid_to_inner(&deployment_id);

    let record = DeploymentRecord {
        deployment_id: deployment_id_copy,
        user,
        repo_url: string::utf8(repo_url),
        commit_hash: string::utf8(commit_hash),
        branch: string::utf8(branch),
        walrus_site_id: string::utf8(b""),
        usdc_paid: payment_amount,
        estimated_wal,
        actual_wal_used: 0,
        created_at: clock::timestamp_ms(clock),
        deployed_at: 0,
        status: STATUS_PENDING,
        build_command: string::utf8(build_command),
        output_dir: string::utf8(output_dir),
        version: get_next_version(registry, &string::utf8(repo_url), user),
        error_message: string::utf8(b""),
        environment: string::utf8(environment),
        deployment_type: 0,
        parent_deployment_id: option::none(),
        metadata: string::utf8(b"{}"),
    };

    // Store deployment
    table::add(&mut registry.deployments, deployment_id_copy, record);

    // Update user's deployment list
    if (!table::contains(&registry.user_deployments, user)) {
        table::add(&mut registry.user_deployments, user, vector::empty());
    };
    let user_list = table::borrow_mut(&mut registry.user_deployments, user);
    vector::push_back(user_list, deployment_id_copy);

    // Update stats
    registry.total_deployments = registry.total_deployments + 1;
    registry.total_usdc_collected = registry.total_usdc_collected + payment_amount;

    // Create deployment request
    let request = DeploymentRequest {
        id: deployment_id,
        user,
        deployment_id: deployment_id_copy,
        repo_url: string::utf8(repo_url),
        branch: string::utf8(branch),
        commit_hash: string::utf8(commit_hash),
        build_command: string::utf8(build_command),
        output_dir: string::utf8(output_dir),
        usdc_paid: payment_amount,
        estimated_wal,
        created_at: clock::timestamp_ms(clock),
    };

    // Transfer payment to treasury
    transfer::public_transfer(payment, registry.treasury_address);

    // Emit event
    event::emit(DeploymentCreated {
        deployment_id: deployment_id_copy,
        user,
        repo_url: string::utf8(repo_url),
        usdc_paid: payment_amount,
        timestamp: clock::timestamp_ms(clock),
    });

    // Transfer request to backend processor address
    transfer::transfer(request, registry.treasury_address);
}

/// Mark deployment as processing
public entry fun mark_processing(
    registry: &mut DeploymentRegistry,
    _processor: &DeploymentProcessor,
    deployment_id: ID,
    _ctx: &mut TxContext,
) {
    let deployment = table::borrow_mut(&mut registry.deployments, deployment_id);
    assert!(deployment.status == STATUS_PENDING, E_INVALID_STATUS);
    deployment.status = STATUS_PROCESSING;
}

/// Mark deployment as completed
public entry fun mark_deployed(
    registry: &mut DeploymentRegistry,
    _processor: &DeploymentProcessor,
    deployment_id: ID,
    walrus_site_id: vector<u8>,
    actual_wal_used: u64,
    clock: &Clock,
    _ctx: &mut TxContext,
) {
    let deployment = table::borrow_mut(&mut registry.deployments, deployment_id);
    assert!(deployment.status == STATUS_PROCESSING, E_INVALID_STATUS);

    deployment.status = STATUS_DEPLOYED;
    deployment.walrus_site_id = string::utf8(walrus_site_id);
    deployment.actual_wal_used = actual_wal_used;
    deployment.deployed_at = clock::timestamp_ms(clock);

    event::emit(DeploymentCompleted {
        deployment_id,
        walrus_site_id: string::utf8(walrus_site_id),
        actual_wal_used,
        timestamp: clock::timestamp_ms(clock),
    });
}

/// Mark deployment as failed
public entry fun mark_failed(
    registry: &mut DeploymentRegistry,
    _processor: &DeploymentProcessor,
    deployment_id: ID,
    error_message: vector<u8>,
    clock: &Clock,
    _ctx: &mut TxContext,
) {
    let deployment = table::borrow_mut(&mut registry.deployments, deployment_id);
    deployment.status = STATUS_FAILED;
    deployment.error_message = string::utf8(error_message);

    event::emit(DeploymentFailed {
        deployment_id,
        error_message: string::utf8(error_message),
        timestamp: clock::timestamp_ms(clock),
    });
}

/// Request deployment with rollback support
public entry fun request_rollback_deployment<T>(
    registry: &mut DeploymentRegistry,
    payment: Coin<T>,
    parent_deployment_id: ID,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = tx_context::sender(ctx);
    let payment_amount = coin::value(&payment);

    // Get parent deployment details and extract needed values
    let (parent_repo_url, parent_commit_hash, parent_branch, parent_estimated_wal,
         parent_build_command, parent_output_dir, parent_version, parent_environment) = {
        let parent = table::borrow(&registry.deployments, parent_deployment_id);
        assert!(parent.user == user, E_UNAUTHORIZED);
        (parent.repo_url, parent.commit_hash, parent.branch, parent.estimated_wal,
         parent.build_command, parent.output_dir, parent.version, parent.environment)
    };

    // Create rollback deployment
    let deployment_uid = object::new(ctx);
    let deployment_id_copy = object::uid_to_inner(&deployment_uid);

    let record = DeploymentRecord {
        deployment_id: deployment_id_copy,
        user,
        repo_url: parent_repo_url,
        commit_hash: parent_commit_hash,
        branch: parent_branch,
        walrus_site_id: string::utf8(b""),
        usdc_paid: payment_amount,
        estimated_wal: parent_estimated_wal,
        actual_wal_used: 0,
        created_at: clock::timestamp_ms(clock),
        deployed_at: 0,
        status: STATUS_PENDING,
        build_command: parent_build_command,
        output_dir: parent_output_dir,
        version: parent_version,
        error_message: string::utf8(b""),
        environment: parent_environment,
        deployment_type: 2, // Rollback
        parent_deployment_id: option::some(parent_deployment_id),
        metadata: string::utf8(b"{\"type\":\"rollback\"}"),
    };

    table::add(&mut registry.deployments, deployment_id_copy, record);

    let user_list = table::borrow_mut(&mut registry.user_deployments, user);
    vector::push_back(user_list, deployment_id_copy);

    registry.total_deployments = registry.total_deployments + 1;

    // Create and transfer the request object
    let request = DeploymentRequest {
        id: deployment_uid,
        user,
        deployment_id: deployment_id_copy,
        repo_url: parent_repo_url,
        branch: parent_branch,
        commit_hash: parent_commit_hash,
        build_command: parent_build_command,
        output_dir: parent_output_dir,
        usdc_paid: payment_amount,
        estimated_wal: parent_estimated_wal,
        created_at: clock::timestamp_ms(clock),
    };

    transfer::public_transfer(payment, registry.treasury_address);
    transfer::transfer(request, registry.treasury_address);
}

// Helper functions
fun get_next_version(registry: &DeploymentRegistry, repo_url: &String, user: address): u64 {
    if (!table::contains(&registry.user_deployments, user)) {
        return 1
    };

    let user_deployments = table::borrow(&registry.user_deployments, user);
    let mut version = 1u64;
    let mut i = 0u64;

    while (i < vector::length(user_deployments)) {
        let deployment_id = *vector::borrow(user_deployments, i);
        let deployment = table::borrow(&registry.deployments, deployment_id);
        if (deployment.repo_url == *repo_url) {
            version = version + 1;
        };
        i = i + 1;
    };

    version
}

// View functions
public fun get_deployment(registry: &DeploymentRegistry, deployment_id: ID): &DeploymentRecord {
    table::borrow(&registry.deployments, deployment_id)
}

public fun get_user_deployments(registry: &DeploymentRegistry, user: address): vector<ID> {
    if (table::contains(&registry.user_deployments, user)) {
        *table::borrow(&registry.user_deployments, user)
    } else {
        vector::empty()
    }
}

public fun get_total_deployments(registry: &DeploymentRegistry): u64 {
    registry.total_deployments
}

public fun get_total_revenue(registry: &DeploymentRegistry): u64 {
    registry.total_usdc_collected
}
