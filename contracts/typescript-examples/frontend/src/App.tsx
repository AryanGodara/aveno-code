import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'

// Components
import Layout from './components/Layout'
import SubscriptionManager from './components/SubscriptionManager'
import DeploymentDashboard from './components/DeploymentDashboard'
import PaymentProcessor from './components/PaymentProcessor'
import ContractInfo from './components/ContractInfo'

// Pages
import HomePage from './pages/HomePage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/subscription" element={<SubscriptionManager />} />
        <Route path="/deployments" element={<DeploymentDashboard />} />
        <Route path="/payments" element={<PaymentProcessor />} />
        <Route path="/contracts" element={<ContractInfo />} />
      </Routes>
    </Layout>
  )
}

export default App