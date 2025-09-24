import React, { useState } from 'react'
import { useSignTransaction, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import {
  AVENOX_CONFIG,
  formatUSDC,
  buildTarget
} from '../../../shared/src/types'

interface SwapRequest {
  usdcAmount: string
  expectedWal: string
}

export default function PaymentProcessor() {
  const client = useSuiClient()
  const account = useCurrentAccount()
  const { mutate: signTransaction, isPending } = useSignTransaction()

  const [swapRequest, setSwapRequest] = useState<SwapRequest>({
    usdcAmount: '',
    expectedWal: ''
  })

  const [processorBalance, setProcessorBalance] = useState({
    usdc: '0',
    wal: '0'
  })

  const handleSwapTokens = async () => {
    if (!account?.address || !swapRequest.usdcAmount) return

    try {
      // Get USDC coins
      const usdcCoins = await client.getCoins({
        owner: account.address,
        coinType: AVENOX_CONFIG.USDC_TESTNET
      })

      if (usdcCoins.data.length === 0) {
        alert('No USDC coins found. Get testnet USDC from https://faucet.circle.com')
        return
      }

      const tx = new Transaction()

      // Use first coin for payment
      const paymentCoin = usdcCoins.data[0].coinObjectId
      const amount = (parseFloat(swapRequest.usdcAmount) * 1_000_000).toString() // Convert to 6-decimal format

      const [swapCoin] = tx.splitCoins(tx.object(paymentCoin), [amount])

      tx.moveCall({
        target: buildTarget(AVENOX_CONFIG.PACKAGE_ID, 'payment_processor', 'process_payment'),
        typeArguments: [AVENOX_CONFIG.USDC_TESTNET, 'WAL_TOKEN_TYPE'], // WAL token type
        arguments: [
          tx.object('PAYMENT_PROCESSOR_ID'), // Would need actual processor ID
          swapCoin,
          tx.pure.u64(swapRequest.expectedWal),
          tx.object(AVENOX_CONFIG.CLOCK_ID)
        ]
      })

      signTransaction({ transaction: tx })
    } catch (error) {
      console.error('Swap failed:', error)
      alert('Swap failed. Please try again.')
    }
  }

  const calculateExpectedWal = (usdcAmount: string) => {
    if (!usdcAmount) return '0'
    // Simplified swap rate calculation (would get from contract in real implementation)
    const rate = 100 // 1 USDC = 100 WAL (example rate)
    const wal = (parseFloat(usdcAmount) * rate).toString()
    setSwapRequest(prev => ({ ...prev, expectedWal: wal }))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Processor</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Token Balance */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Processor Balance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">USDC:</span>
                <span className="font-mono">${formatUSDC(processorBalance.usdc)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">WAL:</span>
                <span className="font-mono">{parseFloat(processorBalance.wal).toLocaleString()} WAL</span>
              </div>
            </div>
          </div>

          {/* Swap Interface */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Swap USDC for WAL</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                USDC Amount
              </label>
              <input
                type="number"
                value={swapRequest.usdcAmount}
                onChange={(e) => {
                  setSwapRequest(prev => ({ ...prev, usdcAmount: e.target.value }))
                  calculateExpectedWal(e.target.value)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected WAL
              </label>
              <input
                type="text"
                value={swapRequest.expectedWal}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="0"
              />
            </div>

            <button
              onClick={handleSwapTokens}
              disabled={isPending || !account || !swapRequest.usdcAmount}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isPending ? 'Processing Swap...' : 'Swap Tokens'}
            </button>

            {!account && (
              <p className="text-sm text-gray-500 text-center">
                Connect your wallet to swap tokens
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Swap Information</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How it Works</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Swap USDC for WAL tokens at current market rate
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                WAL tokens are used for deployment costs on Walrus
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Automatic slippage protection included
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Instant settlement on Sui blockchain
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Rates</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">1 USDC =</span>
                <span className="font-mono">100 WAL</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Min Swap:</span>
                <span className="font-mono">$1.00</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Max Slippage:</span>
                <span className="font-mono">2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}