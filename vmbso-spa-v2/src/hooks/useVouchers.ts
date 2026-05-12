/**
 * Custom hook for managing vouchers data
 * Fetches vouchers for the authenticated user's Account
 * 
 * Uses the same getByAccount flow for both roles:
 * - Installers: Flow returns vouchers where actum_account = accountId
 * - Distributors: Flow returns vouchers where actum_distributorid = accountId
 */

import { useState, useEffect, useCallback } from 'react';
import { dataverseService } from '../services/dataverseService';
import type { Voucher } from '../types/voucher';
import { useAuth } from '../contexts/AuthContext';
import { isDistributor } from '../utils/accessControl';

interface UseVouchersReturn {
  vouchers: Voucher[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isDistributorUser: boolean;
}

export const useVouchers = (): UseVouchersReturn => {
  const { currentUser } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if current user is a distributor
  const isDistributorUser = isDistributor(currentUser);

  const fetchData = useCallback(async () => {
    // Need account ID to fetch vouchers (vouchers are account-scoped)
    const accountId = currentUser?._parentcustomerid_value;

    if (!accountId) {
      setVouchers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Pass role so the flow uses the correct FetchXML and only returns
      // the personal contact data the viewer is entitled to see.
      const role = isDistributorUser ? 'distributor' : 'installer';
      const vouchersData = await dataverseService.vouchers.getByAccount(accountId, role);
      setVouchers(vouchersData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch vouchers';
      setError(message);
      console.error('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?._parentcustomerid_value]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    vouchers,
    loading,
    error,
    refetch: fetchData,
    isDistributorUser,
  };
};
