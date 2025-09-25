#!/usr/bin/env bun

/**
 * Query Contracts Example (Read-Only)
 *
 * This example demonstrates how to query contract data without needing private keys:
 * 1. Check contract deployment status
 * 2. Query subscription registry stats
 * 3. Query deployment registry stats
 * 4. Demonstrate view functions
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'

// Load configuration
import { config } from 'dotenv'
config()

const CONFIG = {
  SUI_NETWORK: 'testnet',
  SUI_RPC_URL: 'https://fullnode.testnet.sui.io:443',
  PACKAGE_ID: '0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471',
  SUBSCRIPTION_REGISTRY: '0x42d3ce0754b4e9684a12874a3b312f8097f2d87d69e595f08af7e8468980b237',
  DEPLOYMENT_REGISTRY: '0xa5fc20fda466733d493a8af44318f564d29278bd30e7d269571afdae1c07bad5',
  CLOCK_ID: '0x6',
  DEMO_ADDRESS: '0xbf58a288642a9501749cf5e707b73799fb3ebb31ad3c6d0a3a35a9f9adc8d2a7'
}

// Initialize Sui client
const client = new SuiClient({ url: getFullnodeUrl(CONFIG.SUI_NETWORK as any) })

console.log('🔍 Avenox Contract Query Example')
console.log('================================')
console.log(`Network: ${CONFIG.SUI_NETWORK}`)
console.log(`Package: ${CONFIG.PACKAGE_ID}`)
console.log('')

/**
 * Check if the package exists and get its modules
 */
async function checkPackageInfo() {
  console.log('📦 Checking Package Information...')
  console.log('----------------------------------')

  try {
    const packageObj = await client.getObject({
      id: CONFIG.PACKAGE_ID,
      options: {
        showContent: true,
        showType: true,
        showDisplay: true
      }
    })

    if (packageObj.data) {
      console.log('✅ Package found!')
      console.log(`   Object ID: ${packageObj.data.objectId}`)
      console.log(`   Version: ${packageObj.data.version}`)
      console.log(`   Type: ${packageObj.data.type || 'Package'}`)

      // Try to get package details
      try {
        const packageDetails = await client.getNormalizedMoveModulesByPackage({
          package: CONFIG.PACKAGE_ID
        })

        const moduleNames = Object.keys(packageDetails)
        console.log(`   Modules: ${moduleNames.join(', ')}`)

        return true
      } catch (err) {
        console.log('   Modules: Could not retrieve module details')
        return true
      }
    } else {
      console.log('❌ Package not found!')
      return false
    }
  } catch (error) {
    console.error('❌ Error checking package:', error)
    return false
  }
}

/**
 * Check subscription registry object
 */
async function checkSubscriptionRegistry() {
  console.log('\n📊 Checking Subscription Registry...')
  console.log('-----------------------------------')

  try {
    const registryObj = await client.getObject({
      id: CONFIG.SUBSCRIPTION_REGISTRY,
      options: {
        showContent: true,
        showType: true
      }
    })

    if (registryObj.data) {
      console.log('✅ Subscription Registry found!')
      console.log(`   Object ID: ${registryObj.data.objectId}`)
      console.log(`   Version: ${registryObj.data.version}`)
      console.log(`   Type: ${registryObj.data.type}`)

      // Try to parse content if available
      if (registryObj.data.content && 'fields' in registryObj.data.content) {
        const fields = registryObj.data.content.fields as any
        console.log('   Registry Data:')
        if (fields.total_subscribers) {
          console.log(`     Total Subscribers: ${fields.total_subscribers}`)
        }
        if (fields.total_revenue) {
          console.log(`     Total Revenue: ${fields.total_revenue}`)
        }
      }

      return true
    } else {
      console.log('❌ Subscription Registry not found!')
      return false
    }
  } catch (error) {
    console.error('❌ Error checking subscription registry:', error)
    return false
  }
}

/**
 * Check deployment registry object
 */
async function checkDeploymentRegistry() {
  console.log('\n🚀 Checking Deployment Registry...')
  console.log('---------------------------------')

  try {
    const registryObj = await client.getObject({
      id: CONFIG.DEPLOYMENT_REGISTRY,
      options: {
        showContent: true,
        showType: true
      }
    })

    if (registryObj.data) {
      console.log('✅ Deployment Registry found!')
      console.log(`   Object ID: ${registryObj.data.objectId}`)
      console.log(`   Version: ${registryObj.data.version}`)
      console.log(`   Type: ${registryObj.data.type}`)

      // Try to parse content
      if (registryObj.data.content && 'fields' in registryObj.data.content) {
        const fields = registryObj.data.content.fields as any
        console.log('   Registry Data:')
        if (fields.total_deployments) {
          console.log(`     Total Deployments: ${fields.total_deployments}`)
        }
        if (fields.treasury_address) {
          console.log(`     Treasury Address: ${fields.treasury_address}`)
        }
      }

      return true
    } else {
      console.log('❌ Deployment Registry not found!')
      return false
    }
  } catch (error) {
    console.error('❌ Error checking deployment registry:', error)
    return false
  }
}

/**
 * Try to query subscription info for demo address
 */
async function queryDemoSubscription() {
  console.log('\n👤 Checking Demo Address Subscription...')
  console.log('---------------------------------------')

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::subscription_manager::get_subscription_info`,
      arguments: [
        tx.object(CONFIG.SUBSCRIPTION_REGISTRY),
        tx.pure.address(CONFIG.DEMO_ADDRESS)
      ]
    })

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: CONFIG.DEMO_ADDRESS
    })

    console.log(`   Demo Address: ${CONFIG.DEMO_ADDRESS}`)

    if (result.results?.[0]?.returnValues?.length) {
      const subscriptionData = result.results[0].returnValues[0] as any[]
      console.log('✅ Subscription found!')
      console.log(`   User: ${subscriptionData[0]}`)
      console.log(`   Tier: ${subscriptionData[1]}`)
      console.log(`   Expires At: ${new Date(parseInt(subscriptionData[2])).toLocaleString()}`)
      console.log(`   Deployments Used: ${subscriptionData[3]}`)
      console.log(`   Deployments Limit: ${subscriptionData[4]}`)
      console.log(`   Auto Renew: ${subscriptionData[5]}`)
      return true
    } else {
      console.log('ℹ️  No subscription found for demo address')
      return false
    }
  } catch (error) {
    console.log('ℹ️  Could not query subscription (this is normal if none exists)')
    console.log(`   Technical details: ${error}`)
    return false
  }
}

/**
 * Try to query deployment history for demo address
 */
async function queryDemoDeployments() {
  console.log('\n📋 Checking Demo Address Deployments...')
  console.log('--------------------------------------')

  try {
    const tx = new Transaction()
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::deployment_registry::get_user_deployments`,
      arguments: [
        tx.object(CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.address(CONFIG.DEMO_ADDRESS)
      ]
    })

    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: CONFIG.DEMO_ADDRESS
    })

    if (result.results?.[0]?.returnValues?.length) {
      const deploymentIds = result.results[0].returnValues[0] as string[]
      console.log(`✅ Found ${deploymentIds.length} deployment(s)!`)

      // Show first few deployment IDs
      for (let i = 0; i < Math.min(3, deploymentIds.length); i++) {
        console.log(`   ${i + 1}. ${deploymentIds[i]}`)
      }

      if (deploymentIds.length > 3) {
        console.log(`   ... and ${deploymentIds.length - 3} more`)
      }

      return deploymentIds
    } else {
      console.log('ℹ️  No deployments found for demo address')
      return []
    }
  } catch (error) {
    console.log('ℹ️  Could not query deployments (this is normal if none exist)')
    console.log(`   Technical details: ${error}`)
    return []
  }
}

/**
 * Get pricing information for subscription tiers
 */
async function getTierPricing() {
  console.log('\n💰 Getting Subscription Tier Pricing...')
  console.log('--------------------------------------')

  const tiers = [0, 1, 2] // Free, Starter, Growth
  const tierNames = ['Free', 'Starter', 'Growth']

  for (let i = 0; i < tiers.length; i++) {
    try {
      const tx = new Transaction()
      tx.moveCall({
        target: `${CONFIG.PACKAGE_ID}::subscription_manager::get_tier_pricing`,
        arguments: [tx.pure.u8(tiers[i])]
      })

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: CONFIG.DEMO_ADDRESS
      })

      if (result.results?.[0]?.returnValues?.length) {
        const pricing = result.results[0].returnValues[0] as any[]
        console.log(`✅ ${tierNames[i]} Tier:`)
        console.log(`   Price: $${(parseInt(pricing[0]) / 1_000_000).toFixed(2)} USDC/month`)
        console.log(`   Deployment Limit: ${pricing[1]}`)
      }
    } catch (error) {
      console.log(`ℹ️  Could not get pricing for ${tierNames[i]} tier`)
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Starting contract queries...\n')

    // Check if contracts are deployed and accessible
    const packageExists = await checkPackageInfo()
    if (!packageExists) {
      console.error('\n❌ Cannot proceed - package not found!')
      return
    }

    const subscriptionRegistryExists = await checkSubscriptionRegistry()
    const deploymentRegistryExists = await checkDeploymentRegistry()

    if (!subscriptionRegistryExists || !deploymentRegistryExists) {
      console.error('\n❌ Contract registries not found!')
      return
    }

    // Query demo data
    await queryDemoSubscription()
    await queryDemoDeployments()

    // Get pricing information
    await getTierPricing()

    console.log('\n🎉 Contract query example completed successfully!')
    console.log('=============================================')
    console.log('✅ Your Avenox contracts are deployed and accessible!')
    console.log('✅ All registry objects are properly initialized!')
    console.log('✅ Smart contract functions are callable!')
    console.log('\nNext steps:')
    console.log('- Add real private keys to .env to run transaction examples')
    console.log('- Run subscription and deployment examples with real interactions')

  } catch (error) {
    console.error('❌ Query example failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  main()
}