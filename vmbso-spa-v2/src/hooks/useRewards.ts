/**
 * Custom hook for managing rewards data
 * Fetches rewards catalog and loyalty points balance
 */

import { useState, useEffect, useCallback } from 'react';
import { dataverseService } from '../services/dataverseService';
import type { Reward } from '../types/reward';
import { useAuth } from '../contexts/AuthContext';

interface UseRewardsReturn {
  rewards: Reward[];
  balance: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useRewards = (): UseRewardsReturn => {
  const { currentUser } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Need account ID for balance calculation (points are account-scoped)
    const accountId = currentUser?._parentcustomerid_value;

    if (!accountId) {
      setRewards([]);
      setBalance(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch catalog and balance in parallel
      const [catalogData, balanceData] = await Promise.all([
        dataverseService.rewards.getCatalog(),
        dataverseService.rewards.getBalance(accountId),
      ]);

      setRewards(catalogData);
      setBalance(balanceData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rewards';
      setError(message);
      console.error('Error fetching rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?._parentcustomerid_value]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    rewards,
    balance,
    loading,
    error,
    refetch: fetchData,
  };
};
