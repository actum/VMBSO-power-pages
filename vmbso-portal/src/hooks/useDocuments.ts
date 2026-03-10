/**
 * Custom hook for fetching documents from Dataverse
 */

import { useState, useEffect, useCallback } from 'react';
import { dataverseService } from '../services/dataverseService';
import { ClientDocument, DocumentFilters } from '../types/document';

export const useDocuments = (filters?: DocumentFilters) => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await dataverseService.documents.getAll(filters);
      setDocuments(docs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(message);
      setDocuments([]);
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, error, refetch: fetchDocuments };
};
