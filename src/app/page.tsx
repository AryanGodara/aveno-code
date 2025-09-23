'use client';

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { WalletGate } from '@/components/wallet-gate';

export default function Home() {
  const account = useCurrentAccount();
  const router = useRouter();

  useEffect(() => {
    if (account) {
      router.push('/dashboard');
    }
  }, [account, router]);

  return <WalletGate />;
}