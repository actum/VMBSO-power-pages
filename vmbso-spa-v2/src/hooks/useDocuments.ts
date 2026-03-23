/**
 * Custom hook for fetching and deduplicating documents via Power Automate flow.
 * The flow returns one row per document-brand pair; this hook aggregates brands
 * so each document appears exactly once with a `brands` array.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { config } from '../config/powerPages.config';
import { ProductDocument, DocumentWithBrands } from '../types/document';
import { useAuth } from '../contexts/AuthContext';

const DEV_MOCK_DOCUMENTS: DocumentWithBrands[] = [
  {
    actum_productdocumentationid: 'dev-doc-001',
    actum_name: 'VMZINC Installation Guide 2026',
    actum_filename: 'vmzinc_installation_guide_2026.pdf',
    actum_description: 'Complete step-by-step installation guide for VMZINC standing seam roofing and façade systems, including substrate preparation, fixings, and weatherproofing details.',
    actum_fileextension: 'pdf',
    actum_language: 'EN',
    actum_visible: true,
    actum_unapprovedaccess: false,
    createdon: '2026-03-20T10:00:00Z',
    brands: [{ id: 'brand-vmzinc', name: 'VMZINC' }],
  },
  {
    actum_productdocumentationid: 'dev-doc-002',
    actum_name: 'Technical Sheet — Mastersystems Pro Series',
    actum_filename: 'mastersystems_pro_technical_sheet.pdf',
    actum_description: 'Detailed technical specifications, dimensional tolerances, and performance data for the full Mastersystems Pro pre-applied self-adhesive tape range.',
    actum_fileextension: 'pdf',
    actum_language: 'FR',
    actum_visible: true,
    actum_unapprovedaccess: false,
    createdon: '2026-03-15T14:30:00Z',
    brands: [
      { id: 'brand-mastersystems', name: 'Mastersystems' },
      { id: 'brand-vmzinc', name: 'VMZINC' },
    ],
  },
  {
    actum_productdocumentationid: 'dev-doc-003',
    actum_name: 'CAD & BIM Files Collection',
    actum_filename: 'vmzinc_cad_bim_2026.zip',
    actum_description: 'Full library of Revit families and AutoCAD detail drawings covering all VMZINC standing seam, flat-lock, and cassette product families for the 2026 range.',
    actum_fileextension: 'zip',
    actum_language: 'NL',
    actum_visible: true,
    actum_unapprovedaccess: false,
    createdon: '2026-03-10T09:00:00Z',
    brands: [{ id: 'brand-vmzinc', name: 'VMZINC' }],
  },
  {
    actum_productdocumentationid: 'dev-doc-004',
    actum_name: 'Resitrix Product Brochure 2026',
    actum_filename: 'resitrix_brochure_2026.pdf',
    actum_description: 'Full product catalogue for the Resitrix EPDM waterproofing membrane range, including system overviews, application guidelines, and certified performance data.',
    actum_fileextension: 'pdf',
    actum_language: 'NL',
    actum_visible: true,
    actum_unapprovedaccess: false,
    createdon: '2026-03-01T08:00:00Z',
    brands: [{ id: 'brand-resitrix', name: 'Resitrix' }],
  },
];

const deduplicateDocuments = (raw: ProductDocument[]): DocumentWithBrands[] => {
  const map = new Map<string, DocumentWithBrands>();

  raw.forEach(row => {
    const id = row.actum_productdocumentationid;
    const brandId = row['brand.actum_brandid'];
    const brandName = row['brand.actum_name'];

    if (map.has(id)) {
      const existing = map.get(id)!;
      if (brandId && !existing.brands.find(b => b.id === brandId)) {
        existing.brands.push({ id: brandId, name: brandName || '' });
      }
    } else {
      const { 'brand.actum_name': _n, 'brand.actum_brandid': _i, ...rest } = row;
      const brands: { id: string; name: string }[] = [];
      if (brandId) brands.push({ id: brandId, name: brandName || '' });
      map.set(id, { ...rest, brands });
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
      }>(config.flows.fetchDocuments, {
        contactId: currentUser.contactid,
      });

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
