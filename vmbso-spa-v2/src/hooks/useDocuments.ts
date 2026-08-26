/**
 * Custom hook for fetching and deduplicating documents via Power Automate flow.
 * The flow returns one row per document-brand pair; this hook aggregates brands
 * so each document appears exactly once with a `brands` array.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { config } from '../config/powerPages.config';
import type { ProductDocument, DocumentWithBrands } from '../types/document';
import { useAuth } from '../contexts/AuthContext';

const DEV_MOCK_DOCUMENTS: DocumentWithBrands[] = [
  {
    // Mirrors real doc with 2 brands and no document type linked
    actum_productdocumentationid: 'c1c16b2a-d726-f111-8341-7ced8d428823',
    actum_name: 'Upload TEST',
    actum_filename: 'SyncUsersFlow_1_0_0_1.zip',
    actum_description: '<div class="ck-content" data-wrapper="true" dir="ltr" style="--ck-image-style-spacing: 1.5em; --ck-inline-image-style-spacing: calc(var(--ck-image-style-spacing) / 2); font-family: Segoe UI; font-size: 11pt;"><p style="margin: 0;">Hi. This is description for the document. <strong>Enjoy it</strong>.</p></div>',
    actum_fileextension: 'zip',
    actum_visible: true,
    actum_unapprovedaccess: false,
    createdon: '2026-03-23T16:41:41Z',
    brands: [
      { id: 'ad236ebd-0900-f111-8407-000d3a66f792', name: 'VMZINC' },
      { id: '0096b0c3-0900-f111-8407-000d3a66f792', name: 'Resitrix' },
    ],
    documentTypes: [],
  },
  {
    // Mirrors real doc with 2 brands × 2 document types (4 raw rows → 1 deduplicated)
    actum_productdocumentationid: '960c34c9-5222-f111-8341-7ced8d428823',
    actum_name: 'TEST',
    actum_visible: true,
    actum_unapprovedaccess: true,
    createdon: '2026-03-17T22:44:08Z',
    brands: [
      { id: 'ad236ebd-0900-f111-8407-000d3a66f792', name: 'VMZINC' },
      { id: '311ce8cb-0900-f111-8407-000d3a66f792', name: 'Mastersystems' },
    ],
    documentTypes: [
      { id: '36ae93e2-c229-f111-8342-000d3aba4b13', name: 'Brochure', code: 'BRC' },
      { id: '21c6affb-c229-f111-8342-000d3aba4b13', name: 'Product overview', code: 'PRDO' },
    ],
  },
];

const deduplicateDocuments = (raw: ProductDocument[]): DocumentWithBrands[] => {
  const map = new Map<string, DocumentWithBrands>();

  raw.forEach(row => {
    const id = row.actum_productdocumentationid;
    const brandId = row['brand.actum_brandid'];
    const brandName = row['brand.actum_name'];
    const doctypeId = row['doctype.actum_documenttypeid'];
    const doctypeName = row['doctype.actum_name'];
    const doctypeCode = row['doctype.actum_code'];

    if (map.has(id)) {
      const existing = map.get(id)!;
      if (brandId && !existing.brands.find(b => b.id === brandId)) {
        existing.brands.push({ id: brandId, name: brandName || '' });
      }
      if (doctypeId && !existing.documentTypes.find(d => d.id === doctypeId)) {
        existing.documentTypes.push({ id: doctypeId, name: doctypeName || '', code: doctypeCode || '' });
      }
    } else {
      const {
        'brand.actum_name': _n, 'brand.actum_brandid': _i,
        'doctype.actum_documenttypeid': _di, 'doctype.actum_name': _dn, 'doctype.actum_code': _dc,
        ...rest
      } = row;
      const brands: { id: string; name: string }[] = [];
      if (brandId) brands.push({ id: brandId, name: brandName || '' });
      const documentTypes: { id: string; name: string; code: string }[] = [];
      if (doctypeId) documentTypes.push({ id: doctypeId, name: doctypeName || '', code: doctypeCode || '' });
      map.set(id, { ...rest, brands, documentTypes });
    }
  });

  return Array.from(map.values());
};

export const useDocuments = () => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState<DocumentWithBrands[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (config.devMode) {
      setDocuments(DEV_MOCK_DOCUMENTS);
      setLoading(false);
      return;
    }

    if (!currentUser?.contactid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.flow<{
        status: string;
        data: ProductDocument[] | string;
        message: string;
      }>(config.flows.fetchDocuments, {});

      if (response?.status === '200') {
        let raw: ProductDocument[];
        if (typeof response.data === 'string') {
          try {
            raw = JSON.parse(response.data);
          } catch (parseError) {
            console.error('Failed to parse documents data:', parseError);
            setError('Failed to parse documents data');
            setDocuments([]);
            return;
          }
        } else {
          raw = response.data;
        }

        if (Array.isArray(raw)) {
          setDocuments(deduplicateDocuments(raw));
        } else {
          setError('Unexpected documents data format');
          setDocuments([]);
        }
      } else if (response?.status === '500') {
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
