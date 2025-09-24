import React, { useState, useEffect } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'
import { AVENOX_CONFIG } from '../../../shared/src/types'

interface ContractInfo {
  packageId: string
  version: string
  modules: string[]
  subscriptionRegistry: {
    id: string
    version: string
    totalSubscribers?: string
    totalRevenue?: string
  }
  deploymentRegistry: {
    id: string
    version: string
    totalDeployments?: string
    treasuryAddress?: string
  }
}

export default function ContractInfo() {
  const client = useSuiClient()
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContractInfo()
  }, [])

  const loadContractInfo = async () => {
    try {
      setLoading(true)

      // Get package info
      const packageObj = await client.getObject({
        id: AVENOX_CONFIG.PACKAGE_ID,
        options: { showContent: true }
      })

      let modules: string[] = []
      try {
        const packageDetails = await client.getNormalizedMoveModulesByPackage({
          package: AVENOX_CONFIG.PACKAGE_ID
        })
        modules = Object.keys(packageDetails)
      } catch (err) {
        modules = ['subscription_manager', 'deployment_registry', 'payment_processor']
      }

      // Get registry info
      const subscriptionRegistry = await client.getObject({
        id: AVENOX_CONFIG.SUBSCRIPTION_REGISTRY,
        options: { showContent: true }
      })

      const deploymentRegistry = await client.getObject({
        id: AVENOX_CONFIG.DEPLOYMENT_REGISTRY,
        options: { showContent: true }
      })

      setContractInfo({
        packageId: AVENOX_CONFIG.PACKAGE_ID,
        version: packageObj.data?.version || 'Unknown',
        modules,
        subscriptionRegistry: {
          id: AVENOX_CONFIG.SUBSCRIPTION_REGISTRY,
          version: subscriptionRegistry.data?.version || 'Unknown',
          totalSubscribers: extractField(subscriptionRegistry.data?.content, 'total_subscribers'),
          totalRevenue: extractField(subscriptionRegistry.data?.content, 'total_revenue')
        },
        deploymentRegistry: {
          id: AVENOX_CONFIG.DEPLOYMENT_REGISTRY,
          version: deploymentRegistry.data?.version || 'Unknown',
          totalDeployments: extractField(deploymentRegistry.data?.content, 'total_deployments'),
          treasuryAddress: extractField(deploymentRegistry.data?.content, 'treasury_address')
        }
      })
    } catch (error) {
      console.error('Failed to load contract info:', error)
    } finally {
      setLoading(false)
    }
  }

  const extractField = (content: any, fieldName: string): string | undefined => {
    if (content && 'fields' in content && content.fields[fieldName]) {
      return content.fields[fieldName].toString()
    }
    return undefined
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!contractInfo) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Failed to Load Contract Info</h2>
          <p className="text-gray-600">Unable to fetch contract information. Please try again.</p>
          <button
            onClick={loadContractInfo}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Package Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Smart Contract Package</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Package Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Package ID:</span>
                <div className="flex items-center">
                  <span className="font-mono text-sm mr-2">{contractInfo.packageId.slice(0, 20)}...</span>
                  <button
                    onClick={() => copyToClipboard(contractInfo.packageId)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-mono">{contractInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="text-green-600 font-medium">Sui Testnet</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Modules</h3>
            <div className="space-y-1">
              {contractInfo.modules.map((module) => (
                <div key={module} className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="font-mono text-sm">{module}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Registry */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Subscription Registry</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Registry Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Registry ID:</span>
                <div className="flex items-center">
                  <span className="font-mono text-sm mr-2">{contractInfo.subscriptionRegistry.id.slice(0, 20)}...</span>
                  <button
                    onClick={() => copyToClipboard(contractInfo.subscriptionRegistry.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-mono">{contractInfo.subscriptionRegistry.version}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Subscribers:</span>
                <span className="font-mono">{contractInfo.subscriptionRegistry.totalSubscribers || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue:</span>
                <span className="font-mono">{contractInfo.subscriptionRegistry.totalRevenue || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Registry */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Deployment Registry</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Registry Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Registry ID:</span>
                <div className="flex items-center">
                  <span className="font-mono text-sm mr-2">{contractInfo.deploymentRegistry.id.slice(0, 20)}...</span>
                  <button
                    onClick={() => copyToClipboard(contractInfo.deploymentRegistry.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-mono">{contractInfo.deploymentRegistry.version}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Deployments:</span>
                <span className="font-mono">{contractInfo.deploymentRegistry.totalDeployments || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Treasury:</span>
                <span className="font-mono text-sm">
                  {contractInfo.deploymentRegistry.treasuryAddress?.slice(0, 10) + '...' || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Information */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Network Information</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Network:</span>
            <span className="ml-2 font-medium">Sui Testnet</span>
          </div>
          <div>
            <span className="text-blue-700">Explorer:</span>
            <a
              href={`https://testnet.suivision.xyz/package/${contractInfo.packageId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:underline"
            >
              View on SuiVision →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}