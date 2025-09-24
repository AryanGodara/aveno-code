'use client';

import { WalletConnectButton } from '@/components/wallet-connect-button';

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <img 
            src="/icon.png" 
            alt="AvenoX Logo" 
            className="w-8 h-8"
          />
          <h1 className="text-2xl font-nohemi text-foreground">
            AVENOX
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}