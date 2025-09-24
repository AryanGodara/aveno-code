import React from 'react'
import Link from 'next/link'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { CreditCard, Rocket, FileText } from 'lucide-react'

const features = [
  {
    icon: CreditCard,
    title: 'Subscription Management',
    description: 'Subscribe to deployment tiers and manage your monthly usage limits.',
    href: '/subscription'
  },
  {
    icon: Rocket,
    title: 'Deploy Applications',
    description: 'Deploy your applications to Walrus with just a few clicks.',
    href: '/deployments'
  },
  {
    icon: FileText,
    title: 'Smart Contracts',
    description: 'View contract information and interact directly with the blockchain.',
    href: '/contracts'
  }
]

export default function HomePage() {
  const account = useCurrentAccount()

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Welcome to <span className="text-primary-600">Avenox</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
          A decentralized platform for deploying your applications using Sui blockchain and Walrus storage.
          Manage subscriptions, process payments, and deploy with confidence.
        </p>

        {!account && (
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-4">Connect your wallet to get started</p>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group relative overflow-hidden rounded-lg bg-white shadow hover:shadow-lg transition-shadow duration-300"
          >
            <div className="p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto mb-4">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {feature.description}
              </p>
            </div>
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary-500 rounded-lg transition-colors duration-300" />
          </Link>
        ))}
      </div>

      {/* Contract Information */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Smart Contract Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900">Network</h3>
            <p className="text-gray-600">Sui Testnet</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Package ID</h3>
            <p className="text-sm text-gray-600 font-mono break-all">
              0x2eafe1e99b918b51abe339a9fcb766b1371e7d311cdbf98cea620cae7b7ba471
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/contracts"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View Full Contract Details →
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      {account && (
        <div className="bg-primary-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-primary-900 mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <p className="text-primary-800">
                <Link href="/subscription" className="font-medium hover:underline">
                  Subscribe to a deployment plan
                </Link> to get started with deployments
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <p className="text-primary-800">
                <Link href="/deployments" className="font-medium hover:underline">
                  Deploy your first application
                </Link> using our deployment dashboard
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <p className="text-primary-800">
                Monitor your deployments and manage your subscription as needed
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}