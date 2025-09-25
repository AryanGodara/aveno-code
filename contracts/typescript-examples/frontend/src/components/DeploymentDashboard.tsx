import React, { useState } from 'react'
import { useSignTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import {
  AVENOX_CONFIG,
  DeploymentRecord,
  DeploymentStatus,
  formatTimestamp,
  buildTarget
} from '../../../shared/src/types'

interface DeploymentRequest {
  repoUrl: string
  branch: string
  buildCommand: string
  outputDir: string
  environment: string
}

export default function DeploymentDashboard() {
  const client = useSuiClient()
  const account = useCurrentAccount()
  const { mutate: signTransaction, isPending } = useSignTransaction()

  const [deploymentRequest, setDeploymentRequest] = useState<DeploymentRequest>({
    repoUrl: '',
    branch: 'main',
    buildCommand: 'npm run build',
    outputDir: 'dist',
    environment: 'production'
  })

  const [deployments, setDeployments] = useState<DeploymentRecord[]>([])

  const handleRequestDeployment = async () => {
    if (!account?.address) return

    const tx = new Transaction()

    // Estimate WAL cost - simplified for demo
    const estimatedWal = '1000000' // 1 WAL token

    tx.moveCall({
      target: buildTarget(AVENOX_CONFIG.PACKAGE_ID, 'deployment_registry', 'request_deployment'),
      typeArguments: [AVENOX_CONFIG.USDC_TESTNET],
      arguments: [
        tx.object(AVENOX_CONFIG.SUBSCRIPTION_REGISTRY),
        tx.object(AVENOX_CONFIG.DEPLOYMENT_REGISTRY),
        tx.pure.string(deploymentRequest.repoUrl),
        tx.pure.string(deploymentRequest.branch),
        tx.pure.string('commit-hash'), // Would get from API
        tx.pure.string(deploymentRequest.buildCommand),
        tx.pure.string(deploymentRequest.outputDir),
        tx.pure.string(estimatedWal),
        tx.pure.string(deploymentRequest.environment),
        tx.object(AVENOX_CONFIG.CLOCK_ID)
      ]
    })

    signTransaction({ transaction: tx })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Request New Deployment</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repository URL
            </label>
            <input
              type="url"
              value={deploymentRequest.repoUrl}
              onChange={(e) => setDeploymentRequest(prev => ({ ...prev, repoUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://github.com/user/repo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <input
              type="text"
              value={deploymentRequest.branch}
              onChange={(e) => setDeploymentRequest(prev => ({ ...prev, branch: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Build Command
            </label>
            <input
              type="text"
              value={deploymentRequest.buildCommand}
              onChange={(e) => setDeploymentRequest(prev => ({ ...prev, buildCommand: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Directory
            </label>
            <input
              type="text"
              value={deploymentRequest.outputDir}
              onChange={(e) => setDeploymentRequest(prev => ({ ...prev, outputDir: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleRequestDeployment}
            disabled={isPending || !account || !deploymentRequest.repoUrl}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isPending ? 'Processing...' : 'Request Deployment'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Deployment History</h2>

        {deployments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium font-nohemi text-gray-900 mb-2">No deployments yet</h3>
            <p className="text-gray-500 font-switzer">Request your first deployment to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deployments.map((deployment) => (
              <div key={deployment.deployment_id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{deployment.repo_url}</h3>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    deployment.status === DeploymentStatus.DEPLOYED ? 'bg-green-100 text-green-800' :
                    deployment.status === DeploymentStatus.PROCESSING ? 'bg-yellow-100 text-yellow-800' :
                    deployment.status === DeploymentStatus.FAILED ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {DeploymentStatus[deployment.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>Branch: {deployment.branch}</div>
                  <div>Environment: {deployment.environment}</div>
                  <div>Created: {formatTimestamp(deployment.created_at)}</div>
                  {deployment.deployed_at && (
                    <div>Deployed: {formatTimestamp(deployment.deployed_at)}</div>
                  )}
                </div>

                {deployment.walrus_site_id && (
                  <div className="mt-2">
                    <a
                      href={`https://${deployment.walrus_site_id}.walrus.site`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Deployment →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}