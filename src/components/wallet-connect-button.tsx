'use client';

import { useCurrentAccount, useDisconnectWallet, useAccounts, ConnectButton } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
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
  useAccounts();

  if (account) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
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
      className={`${className} font-switzer`}
    />
  );
}