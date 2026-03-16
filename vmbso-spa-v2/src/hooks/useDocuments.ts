/**
 * Custom hook for fetching documents via Power Automate flow
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { config } from '../config/powerPages.config';
import { ProductDocument } from '../types/document';
import { useAuth } from '../contexts/AuthContext';

export const useDocuments = () => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState<ProductDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!currentUser?.contactid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.flow<{
        status: string;
        data: ProductDocument[] | string; // Can be array or JSON string
        message: string;
      }>(config.flows.fetchDocuments, {
        contactId: currentUser.contactid,
      });

      if (response?.status === "200") {
        // Parse data if it's a JSON string
        let documents: ProductDocument[];
        if (typeof response.data === 'string') {
          try {
            documents = JSON.parse(response.data);
          } catch (parseError) {
            console.error('Failed to parse documents data:', parseError);
            setError('Failed to parse documents data');
            setDocuments([]);
            return;
          }
        } else {
          documents = response.data;
        }

        if (Array.isArray(documents)) {
          setDocuments(documents);
        } else {
          setError('Unexpected documents data format');
          setDocuments([]);
        }
      } else if (response?.status === "500") {
        setError(response.message || 'Failed to fetch documents');
        setDocuments([]);
      } else {
        setError('Unexpected response from server');
        setDocuments([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(message);
      setDocuments([]);
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.contactid]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, error, refetch: fetchDocuments };
};
