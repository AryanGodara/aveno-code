'use client';

import { WalletConnectButton } from '@/components/wallet-connect-button';
import { ThemeToggle } from '@/components/theme-toggle';

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold font-display text-foreground">
            AvenoX
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}