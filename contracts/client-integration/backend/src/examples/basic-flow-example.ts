#!/usr/bin/env bun

/**
 * Basic Integration Flow Example
 *
 * This example demonstrates the complete user journey:
 * 1. User connects wallet
 * 2. User subscribes to a plan
 * 3. User requests a deployment
 * 4. Admin processes the deployment
 * 5. User checks deployment status
 * 6. User manages subscription
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { fromHEX } from '@mysten/sui/utils'

import { CONFIG, validateConfig } from '../config.js'
import {
  SubscriptionTier,
  DeploymentStatus,
  TIER_INFO,
  formatUSDC,
  formatTimestamp,
  isSubscriptionActive,
  getDeploymentStatusName,
  buildTarget
} from '../../../shared/src/types.js'

// Initialize client
const client = new SuiClient({ url: getFullnodeUrl(CONFIG.SUI_NETWORK as any) })

// Demo user keypair (replace with real keys for testing)
const USER_PRIVATE_KEY = '0x...' // Replace with actual private key
const userKeypair = Ed25519Keypair.fromSecretKey(fromHEX(USER_PRIVATE_KEY))
const userAddress = userKeypair.toSuiAddress()

// Admin keypair for processing deployments
const adminKeypair = CONFIG.ADMIN_PRIVATE_KEY
  ? Ed25519Keypair.fromSecretKey(fromHEX(CONFIG.ADMIN_PRIVATE_KEY))
  : null

console.log('🚀 Avenox Complete Integration Flow')
console.log('=================================')
console.log(`User Address: ${userAddress}`)
console.log(`Network: ${CONFIG.SUI_NETWORK}`)
console.log('')

/**
 * Step 1: Check wallet balance and subscription status
 */
async function step1_checkWalletStatus() {
  console.log('📍 STEP 1: Checking wallet status and subscription')
  console.log('================================================')

  try {
    // Check USDC balance
    const usdcCoins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    const totalUSDC = usdcCoins.data.reduce((sum, coin) => sum + parseInt(coin.balance), 0)
    console.log(`💰 USDC Balance: $${formatUSDC(totalUSDC.toString())}`)

    if (totalUSDC === 0) {
      console.log('⚠️  Warning: No USDC found. Please fund wallet before proceeding.')
      return false
    }

    // Check existing subscription
    const tx = new Transaction()
    tx.moveCall({
      target: buildTarget('subscription_manager', 'get_subscription_info'),
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
      const subData = result.results[0].returnValues[0] as any[]
      const isActive = isSubscriptionActive(subData[2])

      console.log(`🎫 Current Subscription: ${TIER_INFO[subData[1] as SubscriptionTier].name}`)
      console.log(`📅 Status: ${isActive ? 'Active' : 'Expired'}`)
      console.log(`🚀 Deployments: ${subData[3]} / ${subData[4]} used`)

      return {
        hasSubscription: true,
        isActive,
        tier: subData[1] as SubscriptionTier,
        deploymentsUsed: parseInt(subData[3]),
        deploymentsLimit: parseInt(subData[4])
      }
    } else {
      console.log('❌ No subscription found')
      return {
        hasSubscription: false,
        isActive: false,
        tier: null,
        deploymentsUsed: 0,
        deploymentsLimit: 0
      }
    }

  } catch (error) {
    console.error('❌ Error checking wallet status:', error)
    return false
  }
}

/**
 * Step 2: Subscribe to a plan (if needed)
 */
async function step2_subscribe(tier: SubscriptionTier = SubscriptionTier.STARTER) {
  console.log('\n📍 STEP 2: Subscribing to a plan')
  console.log('===============================')

  const tierInfo = TIER_INFO[tier]
  console.log(`🎯 Subscribing to: ${tierInfo.name} ($${formatUSDC(tierInfo.price)}/month)`)

  try {
    // Get USDC coins for payment
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    const totalBalance = coins.data.reduce((sum, coin) => sum + parseInt(coin.balance), 0)
    const requiredAmount = parseInt(tierInfo.price)

    if (totalBalance < requiredAmount) {
      console.error(`❌ Insufficient balance. Need $${formatUSDC(tierInfo.price)}, have $${formatUSDC(totalBalance.toString())}`)
      return false
    }

    const tx = new Transaction()

    // Merge coins if multiple
    let paymentCoin = coins.data[0].coinObjectId
    if (coins.data.length > 1) {
      tx.mergeCoins(
        tx.object(paymentCoin),
        coins.data.slice(1).map(coin => tx.object(coin.coinObjectId))
      )
    }

    // Split exact payment amount
    const [splitCoin] = tx.splitCoins(tx.object(paymentCoin), [tierInfo.price])

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

    const result = await client.signAndExecuteTransaction({
      signer: userKeypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Subscription successful!')
      console.log(`📧 Transaction: ${result.digest}`)

      // Find subscription event
      if (result.events) {
        for (const event of result.events) {
          if (event.type.includes('SubscriptionCreated')) {
            const eventData = event.parsedJson as any
            console.log(`🎉 Subscription created for tier ${eventData.tier}`)
            console.log(`⏰ Expires: ${formatTimestamp(eventData.expires_at)}`)
          }
        }
      }

      return true
    } else {
      console.error('❌ Subscription failed:', result.effects?.status)
      return false
    }

  } catch (error) {
    console.error('❌ Subscription error:', error)
    return false
  }
}

/**
 * Step 3: Request a deployment
 */
async function step3_requestDeployment() {
  console.log('\n📍 STEP 3: Requesting deployment')
  console.log('===============================')

  const deploymentParams = {
    repoUrl: 'https://github.com/awesome-user/my-dapp',
    branch: 'main',
    commitHash: 'f1a2b3c4d5e6',
    buildCommand: 'npm run build',
    outputDir: 'build',
    environment: 'production',
    estimatedWal: '2000000' // 2 WAL tokens
  }

  console.log(`📦 Repository: ${deploymentParams.repoUrl}`)
  console.log(`🌿 Branch: ${deploymentParams.branch}`)
  console.log(`🔧 Build: ${deploymentParams.buildCommand}`)

  try {
    // Get USDC for deployment payment
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    if (coins.data.length === 0) {
      console.error('❌ No USDC coins found for deployment payment')
      return null
    }

    const deploymentCost = '5000000' // $5 per deployment
    console.log(`💰 Deployment cost: $${formatUSDC(deploymentCost)}`)

    const tx = new Transaction()
    const [paymentCoin] = tx.splitCoins(tx.object(coins.data[0].coinObjectId), [deploymentCost])

    tx.moveCall({
      target: buildTarget('deployment_registry', 'request_deployment'),
      typeArguments: [CONFIG.USDC_TOKEN_TYPE],
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        paymentCoin,
        tx.pure.string(deploymentParams.repoUrl),
        tx.pure.string(deploymentParams.branch),
        tx.pure.string(deploymentParams.commitHash),
        tx.pure.string(deploymentParams.buildCommand),
        tx.pure.string(deploymentParams.outputDir),
        tx.pure.string(deploymentParams.environment),
        tx.pure.u64(deploymentParams.estimatedWal),
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    const result = await client.signAndExecuteTransaction({
      signer: userKeypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Deployment requested successfully!')
      console.log(`📧 Transaction: ${result.digest}`)

      // Extract deployment ID from events
      let deploymentId = null
      if (result.events) {
        for (const event of result.events) {
          if (event.type.includes('DeploymentRequested')) {
            deploymentId = (event.parsedJson as any)?.deployment_id
            console.log(`🆔 Deployment ID: ${deploymentId}`)
            break
          }
        }
      }

      return deploymentId
    } else {
      console.error('❌ Deployment request failed:', result.effects?.status)
      return null
    }

  } catch (error) {
    console.error('❌ Deployment request error:', error)
    return null
  }
}

/**
 * Step 4: Admin processes deployment
 */
async function step4_processDeployment(deploymentId: string) {
  if (!adminKeypair) {
    console.log('\n📍 STEP 4: Admin processing (SKIPPED - No admin key)')
    console.log('================================================')
    console.log('⚠️  Admin keypair not configured. Deployment will remain pending.')
    return false
  }

  console.log('\n📍 STEP 4: Admin processing deployment')
  console.log('====================================')

  try {
    // Step 4a: Mark as processing
    console.log('⏳ Marking deployment as processing...')

    let tx = new Transaction()
    tx.moveCall({
      target: buildTarget('deployment_registry', 'mark_processing'),
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.id(deploymentId)
      ]
    })

    let result = await client.signAndExecuteTransaction({
      signer: adminKeypair,
      transaction: tx,
      options: { showEffects: true }
    })

    if (result.effects?.status?.status !== 'success') {
      console.error('❌ Failed to mark as processing')
      return false
    }

    console.log('✅ Deployment marked as processing')

    // Simulate processing time
    console.log('🔨 Simulating build process...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 4b: Mark as completed
    console.log('✅ Marking deployment as completed...')

    tx = new Transaction()
    tx.moveCall({
      target: buildTarget('deployment_registry', 'mark_deployed'),
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.id(deploymentId),
        tx.pure.string('walrus-site-abc123def456'), // Mock Walrus site ID
        tx.pure.u64('1800000'), // 1.8 WAL actually used (less than estimated)
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    result = await client.signAndExecuteTransaction({
      signer: adminKeypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('🎉 Deployment completed successfully!')
      console.log(`📧 Transaction: ${result.digest}`)

      // Find completion event
      if (result.events) {
        for (const event of result.events) {
          if (event.type.includes('DeploymentCompleted')) {
            const eventData = event.parsedJson as any
            console.log(`🌐 Live at: Walrus Site ${eventData.walrus_site_id}`)
          }
        }
      }

      return true
    } else {
      console.error('❌ Failed to mark as completed')
      return false
    }

  } catch (error) {
    console.error('❌ Admin processing error:', error)
    return false
  }
}

/**
 * Step 5: Check final status
 */
async function step5_checkFinalStatus(deploymentId: string) {
  console.log('\n📍 STEP 5: Checking final deployment status')
  console.log('==========================================')

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: buildTarget('deployment_registry', 'get_deployment_info'),
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.id(deploymentId)
      ]
    })

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress
    })

    if (result.results?.[0]?.returnValues?.length) {
      const data = result.results[0].returnValues[0] as any[]
      const status = data[9] as DeploymentStatus

      console.log('📊 Final Deployment Status:')
      console.log(`   🆔 ID: ${deploymentId}`)
      console.log(`   📁 Repository: ${data[2]}`)
      console.log(`   🌿 Branch: ${data[4]}`)
      console.log(`   🎯 Status: ${getDeploymentStatusName(status)}`)
      console.log(`   📅 Created: ${formatTimestamp(data[7])}`)

      if (status === DeploymentStatus.DEPLOYED) {
        console.log(`   🌐 Walrus Site: ${data[5]}`)
        console.log(`   ✅ Deployed: ${formatTimestamp(data[8])}`)
        console.log(`   💎 WAL Used: ${data[8]} (estimated: ${data[7]})`)
      }

      console.log(`   💰 Cost: $${formatUSDC(data[6])}`)

      return true
    } else {
      console.error('❌ Could not retrieve deployment info')
      return false
    }

  } catch (error) {
    console.error('❌ Error checking status:', error)
    return false
  }
}

/**
 * Bonus: Show user dashboard summary
 */
async function showDashboardSummary() {
  console.log('\n📍 BONUS: User Dashboard Summary')
  console.log('===============================')

  try {
    // Get subscription info
    let tx = new Transaction()
    tx.moveCall({
      target: buildTarget('subscription_manager', 'get_subscription_info'),
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        tx.pure.address(userAddress)
      ]
    })

    const subResult = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress
    })

    if (subResult.results?.[0]?.returnValues?.length) {
      const subData = subResult.results[0].returnValues[0] as any[]
      console.log('📊 Subscription Summary:')
      console.log(`   🎫 Plan: ${TIER_INFO[subData[1] as SubscriptionTier].name}`)
      console.log(`   📅 Expires: ${formatTimestamp(subData[2])}`)
      console.log(`   📈 Usage: ${subData[3]} / ${subData[4]} deployments`)
      console.log(`   🔄 Auto-renew: ${subData[5] ? 'Enabled' : 'Disabled'}`)
    }

    // Get deployment count
    tx = new Transaction()
    tx.moveCall({
      target: buildTarget('deployment_registry', 'get_user_deployments'),
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.address(userAddress)
      ]
    })

    const deployResult = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress
    })

    if (deployResult.results?.[0]?.returnValues?.length) {
      const deploymentIds = deployResult.results[0].returnValues[0] as string[]
      console.log(`\n🚀 Total Deployments: ${deploymentIds.length}`)
    }

  } catch (error) {
    console.error('❌ Dashboard summary error:', error)
  }
}

/**
 * Main flow execution
 */
async function main() {
  try {
    console.log('🎬 Starting complete Avenox integration flow...\n')

    // Validate configuration
    validateConfig()

    // Step 1: Check wallet status
    const walletStatus = await step1_checkWalletStatus()
    if (walletStatus === false) {
      console.error('❌ Cannot proceed without USDC balance')
      return
    }

    // Step 2: Subscribe if needed
    if (!walletStatus.hasSubscription || !walletStatus.isActive) {
      const subscribed = await step2_subscribe(SubscriptionTier.STARTER)
      if (!subscribed) {
        console.error('❌ Cannot proceed without active subscription')
        return
      }
    } else {
      console.log('\n✅ Existing active subscription found, skipping step 2')
    }

    // Step 3: Request deployment
    const deploymentId = await step3_requestDeployment()
    if (!deploymentId) {
      console.error('❌ Cannot proceed without deployment request')
      return
    }

    // Step 4: Admin processing
    await step4_processDeployment(deploymentId)

    // Step 5: Check final status
    await step5_checkFinalStatus(deploymentId)

    // Bonus: Dashboard summary
    await showDashboardSummary()

    console.log('\n🎉 COMPLETE! Integration flow finished successfully!')
    console.log('=============================================')
    console.log('Your dApp is now deployed on the decentralized web! 🚀')

  } catch (error) {
    console.error('❌ Integration flow failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}