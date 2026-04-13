import { useCallback, useEffect, useState } from 'react';
import type { Invoice } from '../types/invoice';
import { dataverseService } from '../services/dataverseService';
import { useAuth } from '../contexts/AuthContext';

export const useInvoices = () => {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!currentUser?.contactid) {
      console.warn('No current user or contact ID found. Skipping invoices fetch.');
      setInvoices([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await dataverseService.invoices.getByContact(currentUser.contactid);

      setInvoices(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invoices';

      setError(message);
      setInvoices([]);

      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.contactid]);

  // automatically fetch invoices on first load
  useEffect(() => {
    fetchInvoices();
  }, []);

  return {
    invoices,
    loading,
    error,
    refetch: fetchInvoices,
  };
};
