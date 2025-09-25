'use client';

import { WalletConnectButton } from '@/components/wallet-connect-button';
import { useTheme } from '@/components/theme-provider';

export function WalletGate() {
  const { theme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-8 max-w-lg">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold font-nohemi text-foreground">
              AvenoX
            </h1>
            <h2 className="text-2xl font-nohemi text-foreground">
              Deploy with Ease
            </h2>
          </div>
          <p className="text-muted-foreground text-lg font-switzer">
            Connect your Sui wallet to access the deployment dashboard
          </p>
          <WalletConnectButton connectText="Connect Sui Wallet" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-8 max-w-lg">
        <div className="space-y-4">
          <h1 className={`text-6xl font-bold font-nohemi ${
            theme === 'neon' 
              ? 'text-transparent bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text' 
              : 'text-foreground'
          }`}>
            AvenoX
          </h1>
          <h2 className={`text-2xl font-nohemi ${
            theme === 'neon' 
              ? 'text-cyan-400' 
              : 'text-foreground'
          }`}>
            Deploy with Ease
          </h2>
        </div>

        <p className="text-muted-foreground text-lg font-switzer">
          Connect your Sui wallet to access the deployment dashboard
        </p>

        <div className={`inline-block ${
          theme === 'neon' 
            ? 'neon-glow-cyan hover:neon-glow-green transition-all duration-300' 
            : theme === 'brutal'
            ? 'brutal-shadow brutal-border hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200'
            : ''
        } rounded-lg`}>
          <WalletConnectButton
            connectText="Connect Sui Wallet"
            className="px-8 py-4 text-lg"
          />
        </div>

        <div className="text-sm text-muted-foreground font-switzer">
          Supports Sui Wallet, Suiet, and Slush
        </div>
      </div>
    </div>
  );
}