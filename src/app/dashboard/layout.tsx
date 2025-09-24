'use client';

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = useCurrentAccount();
  const router = useRouter();

  useEffect(() => {
    if (!account) {
      router.push('/');
    }
  }, [account, router]);

  if (!account) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="flex h-[calc(100vh-4rem)]">
        <DashboardSidebar />
        <main className="flex-1 w-full p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}