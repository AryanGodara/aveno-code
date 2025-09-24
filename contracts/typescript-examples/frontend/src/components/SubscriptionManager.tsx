import React, { useState } from 'react'
import { useCurrentAccount, useSignTransaction, useSuiClientQuery } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { SuiClient } from '@mysten/sui/client'

// Shared types and config
import {
  AVENOX_CONFIG,
  SubscriptionTier,
  TIER_INFO,
  formatUSDC,
  formatTimestamp,
  isSubscriptionActive,
  getDaysUntilExpiry,
  buildTarget
} from '../../../shared/src/types'

interface SubscriptionData {
  tier: SubscriptionTier
  expires_at: string
  deployments_used: string
  deployments_limit: string
  auto_renew: boolean
  created_at: string
}

export default function SubscriptionManager() {
  const account = useCurrentAccount()
  const { mutate: signTransaction } = useSignTransaction()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(SubscriptionTier.STARTER)

  // Query current subscription
  const { data: subscriptionData, refetch } = useSuiClientQuery(
    'devInspectTransactionBlock',
    {
      transactionBlock: (() => {
        if (!account) return null

        const tx = new Transaction()
        tx.moveCall({
          target: buildTarget('subscription_manager', 'get_subscription_info'),
          arguments: [
            tx.object(AVENOX_CONFIG.SUBSCRIPTION_REGISTRY),
            tx.pure.address(account.address)
          ]
        })
        return tx
      })(),
      sender: account?.address || '0x0'
    },
    {
      enabled: !!account,
    }
  )

  const currentSubscription = subscriptionData?.results?.[0]?.returnValues?.[0] as SubscriptionData | undefined

  // Subscribe to a tier
  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!account) return

    setIsLoading(true)
    try {
      const tx = new Transaction()

      // Get tier price
      const tierInfo = TIER_INFO[tier]
      const priceInUSDC = tierInfo.price

      // This would need actual USDC coin selection logic
      // For demo purposes, we'll create a placeholder
      tx.moveCall({
        target: buildTarget('subscription_manager', 'subscribe'),
        typeArguments: [AVENOX_CONFIG.USDC_TESTNET],
        arguments: [
          tx.object(AVENOX_CONFIG.SUBSCRIPTION_REGISTRY),
          tx.object('USDC_COIN_OBJECT_ID'), // Would need to be selected from user's coins
          tx.pure.u8(tier),
          tx.pure.bool(true), // auto_renew
          tx.object(AVENOX_CONFIG.CLOCK_ID)
        ]
      })

      signTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Subscription successful:', result)
            refetch()
            setIsLoading(false)
          },
          onError: (error) => {
            console.error('Subscription failed:', error)
            setIsLoading(false)
          }
        }
      )
    } catch (error) {
      console.error('Transaction preparation failed:', error)
      setIsLoading(false)
    }
  }

  // Renew subscription
  const handleRenew = async () => {
    if (!account) return

    setIsLoading(true)
    try {
      const tx = new Transaction()

      tx.moveCall({
        target: buildTarget('subscription_manager', 'renew_subscription'),
        typeArguments: [AVENOX_CONFIG.USDC_TESTNET],
        arguments: [
          tx.object(AVENOX_CONFIG.SUBSCRIPTION_REGISTRY),
          tx.object('USDC_COIN_OBJECT_ID'), // Would need to be selected
          tx.object(AVENOX_CONFIG.CLOCK_ID)
        ]
      })

      signTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            refetch()
            setIsLoading(false)
          },
          onError: (error) => {
            console.error('Renewal failed:', error)
            setIsLoading(false)
          }
        }
      )
    } catch (error) {
      console.error('Renewal preparation failed:', error)
      setIsLoading(false)
    }
  }

  // Cancel subscription
  const handleCancel = async () => {
    if (!account) return

    setIsLoading(true)
    try {
      const tx = new Transaction()

      tx.moveCall({
        target: buildTarget('subscription_manager', 'cancel_subscription'),
        arguments: [
          tx.object(AVENOX_CONFIG.SUBSCRIPTION_REGISTRY)
        ]
      })

      signTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            refetch()
            setIsLoading(false)
          },
          onError: (error) => {
            console.error('Cancellation failed:', error)
            setIsLoading(false)
          }
        }
      )
    } catch (error) {
      console.error('Cancellation preparation failed:', error)
      setIsLoading(false)
    }
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to manage your subscription.</p>
      </div>
    )
  }

  const isActive = currentSubscription ? isSubscriptionActive(currentSubscription.expires_at) : false
  const daysLeft = currentSubscription ? getDaysUntilExpiry(currentSubscription.expires_at) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="mt-2 text-gray-600">Manage your Avenox deployment subscription</p>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription ? (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Tier</p>
              <p className="text-lg font-semibold text-gray-900">
                {TIER_INFO[currentSubscription.tier].name}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className={`text-lg font-semibold ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                {isActive ? 'Active' : 'Expired'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Deployments Used</p>
              <p className="text-lg font-semibold text-gray-900">
                {currentSubscription.deployments_used} / {currentSubscription.deployments_limit}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Expires</p>
              <p className="text-lg font-semibold text-gray-900">
                {isActive ? `${daysLeft} days` : formatTimestamp(currentSubscription.expires_at)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex space-x-4">
            <button
              onClick={handleRenew}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              Renew Subscription
            </button>

            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel Auto-Renewal
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">No Active Subscription</h2>
          <p className="text-yellow-700">You don't have an active subscription. Choose a plan below to get started.</p>
        </div>
      )}

      {/* Pricing Plans */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose Your Plan</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(TIER_INFO).map((tier) => (
            <div
              key={tier.tier}
              className={`border rounded-lg p-6 ${
                selectedTier === tier.tier
                  ? 'border-primary-500 ring-2 ring-primary-500'
                  : 'border-gray-200'
              }`}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ${formatUSDC(tier.price)}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900">
                    {tier.deploymentLimit === 1 ? '1 deployment' : `${tier.deploymentLimit} deployments`} per month
                  </p>
                </div>

                <ul className="mt-4 space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="text-sm text-gray-600">
                      ✓ {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    setSelectedTier(tier.tier)
                    handleSubscribe(tier.tier)
                  }}
                  disabled={isLoading}
                  className={`mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                    tier.tier === SubscriptionTier.GROWTH
                      ? 'text-white bg-primary-600 hover:bg-primary-700'
                      : 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                  } disabled:opacity-50`}
                >
                  {currentSubscription?.tier === tier.tier ? 'Current Plan' : 'Subscribe'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Analytics */}
      {currentSubscription && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Analytics</h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-700">
                <span>Monthly Deployments</span>
                <span>{currentSubscription.deployments_used} / {currentSubscription.deployments_limit}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{
                    width: `${(parseInt(currentSubscription.deployments_used) / parseInt(currentSubscription.deployments_limit)) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}