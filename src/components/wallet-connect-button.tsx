'use client';

import { useCurrentAccount, useDisconnectWallet, useAccounts, ConnectButton } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { Wallet, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WalletConnectButton({ 
  className = '', 
  connectText = 'Connect Wallet'
}: { 
  className?: string;
  connectText?: string;
}) {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { theme, mounted } = useTheme();
  const accounts = useAccounts();

  if (!mounted) {
    return <Button disabled>{connectText}</Button>;
  }

  if (account) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="font-mono text-sm">
            {`${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => disconnect()}>
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <ConnectButton
      connectText={connectText}
      className={`${className} ${
        theme === 'neon'
          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold'
          : theme === 'brutal'
          ? 'bg-green-500 text-black font-bold'
          : ''
      } font-display`}
    />
  );
}