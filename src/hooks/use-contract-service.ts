/**
 * React hook for contract service
 */

import { useMemo } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { ContractService } from '@/services/contracts';

export function useContractService() {
  const client = useSuiClient();

  const contractService = useMemo(() => {
    return new ContractService(client);
  }, [client]);

  return contractService;
}