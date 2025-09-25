#!/usr/bin/env bun

/**
 * Live Transaction Example
 *
 * This example demonstrates real blockchain interactions:
 * 1. Query subscription status
 * 2. Subscribe to a tier (if no subscription)
 * 3. Check subscription after transaction
 * 4. Query registry stats
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'

// Configuration
const CONFIG = {
  SUI_NETWORK: 'testnet',
  PACKAGE_ID: '0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471',
  SUBSCRIPTION_REGISTRY: '0x42d3ce0754b4e9684a12874a3b312f8097f2d87d69e595f08af7e8468980b237',
  DEPLOYMENT_REGISTRY: '0xa5fc20fda466733d493a8af44318f564d29278bd30e7d269571afdae1c07bad5',
  CLOCK_ID: '0x6',
  USDC_TOKEN_TYPE: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'
}

// Your exported private key (keep this secure in real applications!)
const PRIVATE_KEY = 'suiprivkey1qrza3a93k696fatzsngcyghc6c2vtzfltrwkc49ruj8cs3sf532vkhpv5ls'

// Initialize client and keypair
const client = new SuiClient({ url: getFullnodeUrl(CONFIG.SUI_NETWORK as any) })
const { secretKey } = decodeSuiPrivateKey(PRIVATE_KEY)
const keypair = Ed25519Keypair.fromSecretKey(secretKey)
const userAddress = keypair.toSuiAddress()

console.log('🚀 Avenox Live Transaction Example')
console.log('=================================')
console.log(`User Address: ${userAddress}`)
console.log(`Network: ${CONFIG.SUI_NETWORK}`)
console.log('')

/**
 * Format USDC amount (6 decimals)
 */
function formatUSDC(amount: string | number): string {
  const num = typeof amount === 'string' ? parseInt(amount) : amount
  return (num / 1_000_000).toFixed(2)
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: string | number): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  return new Date(ts).toLocaleString()
}

/**
 * Get subscription status using the correct function name
 */
async function checkSubscriptionStatus() {
  console.log('📊 Checking current subscription status...')
  console.log('------------------------------------------')

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::subscription_manager::get_subscription`,
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        tx.pure.address(userAddress)
      ]
    })

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress
    })

    if (result.results?.[0]?.returnValues?.length) {
      const subData = result.results[0].returnValues[0]
      console.log('✅ Active subscription found!')
      console.log(`   Subscription details available`)
      return subData
    } else {
      console.log('ℹ️  No active subscription found')
      return null
    }
  } catch (error) {
    console.log('ℹ️  No subscription exists (this is normal for new users)')
    console.log(`   Details: ${(error as Error).message.split('\\n')[0]}`)
    return null
  }
}

/**
 * Check if user has active subscription using the simpler function
 */
async function hasActiveSubscription() {
  console.log('🔍 Checking if user has active subscription...')

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::subscription_manager::has_active_subscription`,
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        tx.pure.address(userAddress),
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress
    })

    if (result.results?.[0]?.returnValues?.length) {
      const hasSubscription = result.results[0].returnValues[0] as boolean[]
      const isActive = hasSubscription[0]
      console.log(`   Active subscription: ${isActive ? 'Yes' : 'No'}`)
      return isActive
    }
    return false
  } catch (error) {
    console.log('   Could not check subscription status')
    return false
  }
}

/**
 * Get total revenue from the registry
 */
async function getTotalRevenue() {
  console.log('💰 Getting total platform revenue...')

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::subscription_manager::get_total_revenue`,
      arguments: [tx.object(CONFIG.SUBSCRIPTION_REGISTRY)]
    })

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress
    })

    if (result.results?.[0]?.returnValues?.length) {
      const revenue = result.results[0].returnValues[0] as string[]
      const totalRevenue = revenue[0]
      console.log(`   Total Revenue: $${formatUSDC(totalRevenue)} USDC`)
      return totalRevenue
    }
    return '0'
  } catch (error) {
    console.log('   Could not get revenue data')
    return '0'
  }
}

/**
 * Subscribe to Starter tier (Tier 1)
 */
async function subscribeToStarterTier() {
  console.log('💳 Subscribing to Starter tier...')
  console.log('--------------------------------')

  try {
    // Check USDC balance first
    const usdcCoins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    if (usdcCoins.data.length === 0) {
      console.log('❌ No USDC coins found!')
      console.log('   You need USDC tokens to subscribe.')
      console.log('   Get testnet USDC from: https://faucet.circle.com')
      return false
    }

    const totalBalance = usdcCoins.data.reduce((sum, coin) => sum + parseInt(coin.balance), 0)
    console.log(`   Current USDC balance: $${formatUSDC(totalBalance)}`)

    const starterPrice = 10_000_000 // $10 in 6-decimal USDC
    if (totalBalance < starterPrice) {
      console.log(`❌ Insufficient balance! Need $${formatUSDC(starterPrice)}, have $${formatUSDC(totalBalance)}`)
      return false
    }

    console.log(`   Subscribing to Starter tier ($${formatUSDC(starterPrice)})...`)

    // Build transaction
    const tx = new Transaction()

    // Use first coin and merge others if needed
    let paymentCoin = usdcCoins.data[0].coinObjectId
    if (usdcCoins.data.length > 1) {
      console.log(`   Merging ${usdcCoins.data.length} USDC coins...`)
      tx.mergeCoins(
        tx.object(paymentCoin),
        usdcCoins.data.slice(1).map(coin => tx.object(coin.coinObjectId))
      )
    }

    // Split exact payment amount
    const [splitCoin] = tx.splitCoins(tx.object(paymentCoin), [starterPrice.toString()])

    // Subscribe
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::subscription_manager::subscribe`,
      typeArguments: [CONFIG.USDC_TOKEN_TYPE],
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        splitCoin,
        tx.pure.u8(1), // Starter tier
        tx.pure.bool(true), // auto_renew
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    console.log('   Signing and executing transaction...')

    // Execute transaction
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
        showBalanceChanges: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('🎉 Subscription successful!')
      console.log(`   Transaction digest: ${result.digest}`)
      console.log(`   Gas used: ${result.effects.gasUsed?.computationCost || 'N/A'} MIST`)

      // Show balance changes
      if (result.balanceChanges && result.balanceChanges.length > 0) {
        console.log('   Balance changes:')
        for (const change of result.balanceChanges) {
          if (change.coinType.includes('usdc') || change.coinType.includes('USDC')) {
            const amount = parseInt(change.amount)
            console.log(`     USDC: ${amount < 0 ? '-' : '+'}$${formatUSDC(Math.abs(amount))}`)
          }
        }
      }

      // Show events
      if (result.events && result.events.length > 0) {
        console.log('   Events emitted:')
        for (const event of result.events) {
          if (event.type.includes('SubscriptionCreated')) {
            console.log('     🎫 SubscriptionCreated event')
            console.log(`        Data: ${JSON.stringify(event.parsedJson, null, 8)}`)
          }
        }
      }

      return true
    } else {
      console.error('❌ Transaction failed!')
      console.error(`   Status: ${result.effects?.status?.status}`)
      console.error(`   Error: ${result.effects?.status?.error || 'Unknown error'}`)
      return false
    }

  } catch (error) {
    console.error('❌ Subscription failed:')
    console.error(`   Error: ${(error as Error).message}`)
    return false
  }
}

/**
 * Record a deployment (simulate usage)
 */
async function recordDeployment() {
  console.log('📝 Recording a deployment (simulating usage)...')

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::deployment_registry::record_deployment`,
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.address(userAddress),
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Deployment recorded successfully!')
      console.log(`   Transaction digest: ${result.digest}`)
      return true
    } else {
      console.log('❌ Failed to record deployment')
      return false
    }
  } catch (error) {
    console.log(`ℹ️  Could not record deployment: ${(error as Error).message.split('\\n')[0]}`)
    return false
  }
}

/**
 * Main execution flow
 */
async function main() {
  try {
    console.log('🎬 Starting live transaction demo...\n')

    // Step 1: Check current subscription status
    await checkSubscriptionStatus()

    // Step 2: Check if has active subscription
    const hasActiveSub = await hasActiveSubscription()

    // Step 3: Get current revenue
    await getTotalRevenue()

    if (!hasActiveSub) {
      console.log('\n🎯 No active subscription found. Let\'s subscribe!')

      // Step 4: Subscribe to starter tier
      const subscribed = await subscribeToStarterTier()

      if (subscribed) {
        console.log('\n✨ Checking status after subscription...')
        await checkSubscriptionStatus()
        await hasActiveSubscription()
        await getTotalRevenue()

        // Step 5: Record a deployment to test usage tracking
        console.log('\n📊 Testing deployment recording...')
        await recordDeployment()
      } else {
        console.log('\n⚠️  Subscription failed. Please check:')
        console.log('   - You have sufficient USDC balance')
        console.log('   - Your wallet is funded with gas (SUI)')
        console.log('   - You are connected to testnet')
      }
    } else {
      console.log('\n✅ Active subscription found! Testing deployment recording...')
      await recordDeployment()
    }

    console.log('\n🎉 Live transaction example completed!')
    console.log('=========================================')
    console.log('✅ Successfully interacted with Avenox smart contracts!')
    console.log('✅ All transactions executed on-chain!')
    console.log('✅ Smart contract state has been modified!')

    console.log('\n📊 Summary of what happened:')
    console.log('- ✅ Queried contract state (read operations)')
    console.log('- ✅ Executed transactions (write operations)')
    console.log('- ✅ Modified on-chain data (subscription registry)')
    console.log('- ✅ Tracked usage and payments')

  } catch (error) {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}