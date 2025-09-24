#!/usr/bin/env bun

/**
 * Deployment Management Example
 *
 * This example demonstrates how to:
 * 1. Request a new deployment
 * 2. Check deployment status
 * 3. Mark deployment as processing (admin)
 * 4. Mark deployment as completed (admin)
 * 5. Request rollback deployment
 * 6. Get user deployment history
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { fromHEX } from '@mysten/sui/utils'

import { CONFIG, validateConfig } from '../config.js'
import {
  DeploymentStatus,
  formatUSDC,
  formatTimestamp,
  getDeploymentStatusName,
  buildTarget,
  generateMockDeploymentId
} from '../../../shared/src/types.js'

// Initialize Sui client
const client = new SuiClient({ url: getFullnodeUrl(CONFIG.SUI_NETWORK as any) })

// Example user keypair
const EXAMPLE_PRIVATE_KEY = '0x...' // Replace with actual private key
const keypair = Ed25519Keypair.fromSecretKey(fromHEX(EXAMPLE_PRIVATE_KEY))
const userAddress = keypair.toSuiAddress()

// Admin keypair (for admin functions)
const adminKeypair = CONFIG.ADMIN_PRIVATE_KEY
  ? Ed25519Keypair.fromSecretKey(fromHEX(CONFIG.ADMIN_PRIVATE_KEY))
  : null

console.log('🚀 Avenox Deployment Management Example')
console.log('======================================')
console.log(`User Address: ${userAddress}`)
console.log(`Network: ${CONFIG.SUI_NETWORK}`)

/**
 * Request a new deployment
 */
async function requestDeployment(params: {
  repoUrl: string
  branch: string
  commitHash: string
  buildCommand: string
  outputDir: string
  environment: string
  estimatedWal: string
}) {
  console.log('\n🚀 Requesting new deployment...')
  console.log(`   Repository: ${params.repoUrl}`)
  console.log(`   Branch: ${params.branch}`)
  console.log(`   Environment: ${params.environment}`)

  try {
    // Get USDC coins for payment
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    if (coins.data.length === 0) {
      console.error('❌ No USDC coins found for deployment payment')
      return null
    }

    // Calculate deployment cost (example: $5 per deployment)
    const deploymentCost = '5000000' // $5 in 6-decimal USDC
    console.log(`   Deployment cost: $${formatUSDC(deploymentCost)} USDC`)

    const tx = new Transaction()

    // Prepare payment coin
    const [paymentCoin] = tx.splitCoins(
      tx.object(coins.data[0].coinObjectId),
      [deploymentCost]
    )

    // Request deployment
    tx.moveCall({
      target: buildTarget('deployment_registry', 'request_deployment'),
      typeArguments: [CONFIG.USDC_TOKEN_TYPE],
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        paymentCoin,
        tx.pure.string(params.repoUrl),
        tx.pure.string(params.branch),
        tx.pure.string(params.commitHash),
        tx.pure.string(params.buildCommand),
        tx.pure.string(params.outputDir),
        tx.pure.string(params.environment),
        tx.pure.u64(params.estimatedWal),
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Deployment requested successfully!')
      console.log(`   Transaction: ${result.digest}`)

      // Extract deployment ID from events
      let deploymentId = null
      if (result.events?.length) {
        for (const event of result.events) {
          if (event.type.includes('DeploymentRequested')) {
            deploymentId = (event.parsedJson as any)?.deployment_id
            console.log('📧 DeploymentRequested event emitted')
            console.log(`   Deployment ID: ${deploymentId}`)
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
    console.error('❌ Deployment request failed:', error)
    return null
  }
}

/**
 * Check deployment status
 */
async function checkDeploymentStatus(deploymentId: string) {
  console.log(`\n📊 Checking deployment status for ID: ${deploymentId}`)

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
      const deploymentData = result.results[0].returnValues[0] as any[]
      const status = deploymentData[9] as DeploymentStatus

      console.log('✅ Deployment found:')
      console.log(`   Status: ${getDeploymentStatusName(status)}`)
      console.log(`   Repository: ${deploymentData[2]}`)
      console.log(`   Branch: ${deploymentData[4]}`)
      console.log(`   Created: ${formatTimestamp(deploymentData[7])}`)
      console.log(`   USDC Paid: $${formatUSDC(deploymentData[6])}`)

      if (status === DeploymentStatus.DEPLOYED) {
        console.log(`   Walrus Site ID: ${deploymentData[5]}`)
        console.log(`   Deployed: ${formatTimestamp(deploymentData[8])}`)
      } else if (status === DeploymentStatus.FAILED) {
        console.log(`   Error: ${deploymentData[13]}`)
      }

      return {
        id: deploymentId,
        status,
        data: deploymentData
      }
    } else {
      console.log('❌ Deployment not found')
      return null
    }
  } catch (error) {
    console.error('❌ Error checking deployment status:', error)
    return null
  }
}

/**
 * Mark deployment as processing (Admin only)
 */
async function markDeploymentProcessing(deploymentId: string) {
  if (!adminKeypair) {
    console.error('❌ Admin keypair not configured')
    return
  }

  console.log(`\n⏳ Marking deployment ${deploymentId} as processing...`)

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: buildTarget('deployment_registry', 'mark_processing'),
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.id(deploymentId)
      ]
    })

    const result = await client.signAndExecuteTransaction({
      signer: adminKeypair,
      transaction: tx,
      options: { showEffects: true }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Deployment marked as processing')
      console.log(`   Transaction: ${result.digest}`)
    } else {
      console.error('❌ Failed to mark as processing:', result.effects?.status)
    }

  } catch (error) {
    console.error('❌ Error marking as processing:', error)
  }
}

/**
 * Mark deployment as completed (Admin only)
 */
async function markDeploymentCompleted(deploymentId: string, walrusSiteId: string, walUsed: string) {
  if (!adminKeypair) {
    console.error('❌ Admin keypair not configured')
    return
  }

  console.log(`\n✅ Marking deployment ${deploymentId} as completed...`)

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: buildTarget('deployment_registry', 'mark_deployed'),
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.id(deploymentId),
        tx.pure.string(walrusSiteId),
        tx.pure.u64(walUsed),
        tx.object(CONFIG.CLOCK_ID)
      ]
    })

    const result = await client.signAndExecuteTransaction({
      signer: adminKeypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true
      }
    })

    if (result.effects?.status?.status === 'success') {
      console.log('✅ Deployment marked as completed')
      console.log(`   Transaction: ${result.digest}`)
      console.log(`   Walrus Site ID: ${walrusSiteId}`)

      // Check for completion event
      if (result.events?.length) {
        for (const event of result.events) {
          if (event.type.includes('DeploymentCompleted')) {
            console.log('📧 DeploymentCompleted event emitted')
            console.log(`   Event data:`, event.parsedJson)
          }
        }
      }
    } else {
      console.error('❌ Failed to mark as completed:', result.effects?.status)
    }

  } catch (error) {
    console.error('❌ Error marking as completed:', error)
  }
}

/**
 * Request rollback deployment
 */
async function requestRollback(parentDeploymentId: string) {
  console.log(`\n🔄 Requesting rollback to deployment ${parentDeploymentId}...`)

  try {
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: CONFIG.USDC_TOKEN_TYPE
    })

    const rollbackCost = '5000000' // $5 for rollback
    console.log(`   Rollback cost: $${formatUSDC(rollbackCost)} USDC`)

    const tx = new Transaction()
    const [paymentCoin] = tx.splitCoins(
      tx.object(coins.data[0].coinObjectId),
      [rollbackCost]
    )

    tx.moveCall({
      target: buildTarget('deployment_registry', 'request_rollback_deployment'),
      typeArguments: [CONFIG.USDC_TOKEN_TYPE],
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        paymentCoin,
        tx.pure.id(parentDeploymentId),
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
      console.log('✅ Rollback deployment requested!')
      console.log(`   Transaction: ${result.digest}`)

      // Find the new rollback deployment ID
      if (result.events?.length) {
        for (const event of result.events) {
          if (event.type.includes('DeploymentRequested')) {
            const rollbackId = (event.parsedJson as any)?.deployment_id
            console.log(`   Rollback Deployment ID: ${rollbackId}`)
            return rollbackId
          }
        }
      }
    } else {
      console.error('❌ Rollback request failed:', result.effects?.status)
    }

  } catch (error) {
    console.error('❌ Rollback request failed:', error)
  }
}

/**
 * Get user's deployment history
 */
async function getUserDeployments(userAddress: string) {
  console.log(`\n📋 Getting deployment history for ${userAddress}...`)

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: buildTarget('deployment_registry', 'get_user_deployments'),
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.address(userAddress)
      ]
    })

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress
    })

    if (result.results?.[0]?.returnValues?.length) {
      const deploymentIds = result.results[0].returnValues[0] as string[]
      console.log(`✅ Found ${deploymentIds.length} deployments:`)

      for (const id of deploymentIds.slice(0, 5)) { // Show first 5
        await checkDeploymentStatus(id)
        console.log('   ---')
      }

      if (deploymentIds.length > 5) {
        console.log(`   ... and ${deploymentIds.length - 5} more`)
      }
    } else {
      console.log('❌ No deployments found')
    }

  } catch (error) {
    console.error('❌ Error getting deployment history:', error)
  }
}

/**
 * Main execution flow
 */
async function main() {
  try {
    validateConfig()

    // Example deployment parameters
    const deploymentParams = {
      repoUrl: 'https://github.com/user/awesome-dapp',
      branch: 'main',
      commitHash: 'abc123def456',
      buildCommand: 'npm run build',
      outputDir: 'dist',
      environment: 'production',
      estimatedWal: '1000000' // 1 WAL
    }

    // 1. Request a new deployment
    const deploymentId = await requestDeployment(deploymentParams)

    if (deploymentId) {
      // 2. Check deployment status
      await checkDeploymentStatus(deploymentId)

      // 3. Admin: Mark as processing
      if (adminKeypair) {
        await markDeploymentProcessing(deploymentId)
        await checkDeploymentStatus(deploymentId)

        // 4. Admin: Mark as completed
        await markDeploymentCompleted(
          deploymentId,
          'walrus-site-abc123', // Mock Walrus site ID
          '750000' // 0.75 WAL actually used
        )
        await checkDeploymentStatus(deploymentId)

        // 5. Request rollback (using the just completed deployment)
        const rollbackId = await requestRollback(deploymentId)
      }
    }

    // 6. Get user's deployment history
    await getUserDeployments(userAddress)

    console.log('\n✅ Deployment example completed successfully!')

  } catch (error) {
    console.error('❌ Example failed:', error)
    process.exit(1)
  }
}

// Run example if called directly
if (import.meta.main) {
  main()
}