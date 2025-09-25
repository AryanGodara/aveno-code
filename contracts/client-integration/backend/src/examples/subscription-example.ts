#!/usr/bin/env bun

/**
 * Subscription Management Example
 *
 * This example demonstrates how to:
 * 1. Check user subscription status
 * 2. Subscribe to a tier
 * 3. Renew subscription
 * 4. Upgrade tier
 * 5. Cancel subscription
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { fromHEX } from '@mysten/sui/utils'

import { CONFIG, validateConfig } from '../config.js'
import {
  SubscriptionTier,
  TIER_INFO,
  formatUSDC,
  formatTimestamp,
  isSubscriptionActive,
  buildTarget
} from '../../../shared/src/types.js'

// Initialize Sui client
const client = new SuiClient({ url: getFullnodeUrl(CONFIG.SUI_NETWORK as any) })

// Example user keypair (in practice, this would come from user input)
const EXAMPLE_PRIVATE_KEY = '0x...' // Replace with actual private key for testing
const keypair = Ed25519Keypair.fromSecretKey(fromHEX(EXAMPLE_PRIVATE_KEY))
const userAddress = keypair.toSuiAddress()

console.log('🚀 Avenox Subscription Management Example')
console.log('=========================================')
console.log(`User Address: ${userAddress}`)
console.log(`Network: ${CONFIG.SUI_NETWORK}`)
console.log(`Package: ${CONFIG.PACKAGE_ID}`)

/**
 * Check current subscription status for a user
 */
async function checkSubscriptionStatus(address: string) {
  console.log('\n📊 Checking subscription status...')

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: buildTarget('subscription_manager', 'get_subscription_info'),
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        tx.pure.address(address)
      ]
    })

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: address
    })

    if (result.results?.[0]?.returnValues?.length) {
      const subscriptionData = result.results[0].returnValues[0] as any
      console.log('✅ Subscription found:')
      console.log(`   Tier: ${TIER_INFO[subscriptionData[1] as SubscriptionTier].name}`)
      console.log(`   Expires: ${formatTimestamp(subscriptionData[2])}`)
      console.log(`   Deployments Used: ${subscriptionData[3]} / ${subscriptionData[4]}`)
      console.log(`   Auto Renew: ${subscriptionData[5]}`)
      console.log(`   Active: ${isSubscriptionActive(subscriptionData[2]) ? 'Yes' : 'No'}`)

      return {
        tier: subscriptionData[1] as SubscriptionTier,
        expires_at: subscriptionData[2],
        deployments_used: subscriptionData[3],
        deployments_limit: subscriptionData[4],
        auto_renew: subscriptionData[5]
      }
    } else {
      console.log('❌ No subscription found')
      return null
    }
  } catch (error) {
    console.error('❌ Error checking subscription:', error)
    return null
  }
}

/**
 * Subscribe to a tier
 */
async function subscribeToTier(tier: SubscriptionTier) {
  console.log(`\n💳 Subscribing to ${TIER_INFO[tier].name} tier...`)

  try {
    // First, get USDC coins for payment
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    if (coins.data.length === 0) {
      console.error('❌ No USDC coins found. Please fund your wallet first.')
      return
    }

    const requiredAmount = TIER_INFO[tier].price
    console.log(`   Required payment: $${formatUSDC(requiredAmount)} USDC`)

    // Find a suitable coin or merge coins
    const totalBalance = coins.data.reduce((sum, coin) => sum + parseInt(coin.balance), 0)
    if (totalBalance < parseInt(requiredAmount)) {
      console.error('❌ Insufficient USDC balance')
      return
    }

    const tx = new Transaction()

    // Use the first coin and merge others if needed
    let paymentCoin = coins.data[0].coinObjectId
    if (coins.data.length > 1) {
      tx.mergeCoins(
        tx.object(paymentCoin),
        coins.data.slice(1).map(coin => tx.object(coin.coinObjectId))
      )
    }

    // Split exact amount for payment
    const [splitCoin] = tx.splitCoins(tx.object(paymentCoin), [requiredAmount])

    // Subscribe
    tx.moveCall({
      target: buildTarget('subscription_manager', 'subscribe'),
      typeArguments: [CONFIG.USDC_TOKEN_TYPE],
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        splitCoin,
        tx.pure.u8(tier),
        tx.pure.bool(true), // auto_renew
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    // Execute transaction
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Subscription successful!')
      console.log(`   Transaction: ${result.digest}`)

      // Check for events
      if (result.events?.length) {
        for (const event of result.events) {
          if (event.type.includes('SubscriptionCreated')) {
            console.log('📧 SubscriptionCreated event emitted')
            console.log(`   Event data:`, event.parsedJson)
          }
        }
      }
    } else {
      console.error('❌ Transaction failed:', result.effects?.status)
    }

  } catch (error) {
    console.error('❌ Subscription failed:', error)
  }
}

/**
 * Renew existing subscription
 */
async function renewSubscription() {
  console.log('\n🔄 Renewing subscription...')

  try {
    // Get current subscription to determine renewal cost
    const currentSub = await checkSubscriptionStatus(userAddress)
    if (!currentSub) {
      console.error('❌ No subscription to renew')
      return
    }

    const renewalCost = TIER_INFO[currentSub.tier].price
    console.log(`   Renewal cost: $${formatUSDC(renewalCost)} USDC`)

    // Get USDC coins
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    if (coins.data.length === 0) {
      console.error('❌ No USDC coins found')
      return
    }

    const tx = new Transaction()

    // Prepare payment coin
    let paymentCoin = coins.data[0].coinObjectId
    const [splitCoin] = tx.splitCoins(tx.object(paymentCoin), [renewalCost])

    // Renew subscription
    tx.moveCall({
      target: buildTarget('subscription_manager', 'renew_subscription'),
      typeArguments: [CONFIG.USDC_TOKEN_TYPE],
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        splitCoin,
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Subscription renewed successfully!')
      console.log(`   Transaction: ${result.digest}`)
    } else {
      console.error('❌ Renewal failed:', result.effects?.status)
    }

  } catch (error) {
    console.error('❌ Renewal failed:', error)
  }
}

/**
 * Upgrade to a higher tier
 */
async function upgradeTier(newTier: SubscriptionTier) {
  console.log(`\n⬆️ Upgrading to ${TIER_INFO[newTier].name} tier...`)

  try {
    // Get upgrade cost
    const upgradeCost = TIER_INFO[newTier].price
    console.log(`   Upgrade cost: $${formatUSDC(upgradeCost)} USDC`)

    const coins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    const tx = new Transaction()
    const [splitCoin] = tx.splitCoins(tx.object(coins.data[0].coinObjectId), [upgradeCost])

    tx.moveCall({
      target: buildTarget('subscription_manager', 'upgrade_tier'),
      typeArguments: [CONFIG.USDC_TOKEN_TYPE],
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        splitCoin,
        tx.pure.u8(newTier),
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Tier upgraded successfully!')
      console.log(`   Transaction: ${result.digest}`)
    } else {
      console.error('❌ Upgrade failed:', result.effects?.status)
    }

  } catch (error) {
    console.error('❌ Upgrade failed:', error)
  }
}

/**
 * Cancel subscription (disable auto-renewal)
 */
async function cancelSubscription() {
  console.log('\n❌ Canceling subscription (disabling auto-renewal)...')

  try {
    const tx = new Transaction()

    tx.moveCall({
      target: buildTarget('subscription_manager', 'cancel_subscription'),
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY)
      ]
    })

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Subscription auto-renewal cancelled!')
      console.log(`   Transaction: ${result.digest}`)
    } else {
      console.error('❌ Cancellation failed:', result.effects?.status)
    }

  } catch (error) {
    console.error('❌ Cancellation failed:', error)
  }
}

/**
 * Main execution flow
 */
async function main() {
  try {
    // Validate configuration
    validateConfig()

    // Check current status
    const currentSub = await checkSubscriptionStatus(userAddress)

    if (!currentSub) {
      // No subscription - demonstrate subscription flow
      console.log('\n🎯 No subscription found. Demonstrating subscription flow...')

      // Subscribe to Starter tier
      await subscribeToTier(SubscriptionTier.STARTER)

      // Check status after subscription
      await checkSubscriptionStatus(userAddress)

    } else {
      // Has subscription - demonstrate management flows
      console.log('\n🎯 Subscription found. Demonstrating management flows...')

      if (currentSub.tier === SubscriptionTier.STARTER) {
        // Upgrade to Growth tier
        await upgradeTier(SubscriptionTier.GROWTH)
      } else {
        // Renew existing subscription
        await renewSubscription()
      }
    }

    console.log('\n✅ Example completed successfully!')

  } catch (error) {
    console.error('❌ Example failed:', error)
    process.exit(1)
  }
}

// Run example if called directly
if (import.meta.main) {
  main()
}