/**
 * Dataverse Web API service layer
 * Handles all CRUD operations for Dataverse entities
 */

import { apiClient, ApiError } from './apiClient';
import { Contact } from '../types/contact';
import { Account } from '../types/account';
import { Brand } from '../types/brand';
import { Country } from '../types/country';
import { ClientDocument, DocumentFilters } from '../types/document';
import { config } from '../config/powerPages.config';

/**
 * OData query builder
 */
function buildODataQuery(params: {
  select?: string[];
  expand?: string[];
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
}): string {
  const query = new URLSearchParams();
  if (params.select?.length) query.append('$select', params.select.join(','));
  if (params.expand?.length) query.append('$expand', params.expand.join(','));
  if (params.filter) query.append('$filter', params.filter);
  if (params.orderby) query.append('$orderby', params.orderby);
  if (params.top) query.append('$top', params.top.toString());
  if (params.skip) query.append('$skip', params.skip.toString());
  return query.toString() ? `?${query.toString()}` : '';
}

export const dataverseService = {
  /**
   * Contact operations
   */
  contacts: {
    /**
     * Get current authenticated user's contact record
     * Power Pages Web API automatically scopes /_api/contacts to the authenticated user
     */
    async getCurrent(): Promise<Contact | null> {
      if (config.devMode) {
        // Dev mode handled by caller (authService)
        throw new Error('Dev mode should be handled by authService');
      }

      try {
        const fields = [
          // Standard contact fields
          'contactid',
          'firstname',
          'lastname',
          'emailaddress1',
          'fullname',
          'mobilephone',
          'telephone1',
          'jobtitle',
          'createdon',
          'modifiedon',
          // Custom fields that actually exist (from screenshot)
          'actum_approvalstatus',
          '_actum_languageid_value',
          '_parentcustomerid_value',  // Account lookup for Company Name
          'mspp_userpreferredlcid',
          // Portal identity fields
          'adx_identity_username',
          'adx_identity_emailaddress1confirmed',
        ];

        const query = buildODataQuery({ 
          select: fields,
          // Temporarily disable $expand to avoid 400 errors
          // expand: [
          //   'actum_languageid($select=actum_languageid,actum_name)',
          //   'parentcustomerid($select=accountid,name)'  // Expand Account for Company Name
          // ],
          top: 1 
        });
        
        const response = await apiClient.odata<{ value: Contact[] }>(`/contacts${query}`);

        if (!response.value?.length) {
          console.warn('No contact record found for authenticated user');
          return null;
        }

        return response.value[0];
      } catch (error) {
        // 401/403 means no active session
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          return null;
        }

        console.error('Error fetching contact:', error);
        throw error;
      }
    },

    /**
     * Update contact record
     */
    async update(contactId: string, fields: Partial<Contact>): Promise<Contact> {
      if (config.devMode) {
        // Dev mode handled by caller (authService)
        throw new Error('Dev mode should be handled by authService');
      }

      if (!contactId) {
        throw new Error('Missing contact ID for update');
      }

      // Remove read-only fields
      const { contactid, createdon, _parentcustomerid_value, ...rest } = fields;

      // Convert raw lookup value to OData bind syntax for Dataverse PATCH
      const updateFields: Record<string, unknown> = { ...rest };
      if (_parentcustomerid_value) {
        updateFields['parentcustomerid_account@odata.bind'] = `/accounts(${_parentcustomerid_value})`;
      }

      await apiClient.odata(`/contacts(${contactId})`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': '*', // Required by Dataverse
          'Prefer': 'return=representation', // Request updated record in response
        },
        body: JSON.stringify(updateFields),
      });

      // Re-fetch to ensure we have latest data
      // (Prefer header may not be supported, so we always re-fetch for safety)
      const updated = await this.getCurrent();
      if (!updated) {
        throw new Error('Unable to fetch updated contact');
      }
      return updated;
    },
  },

  /**
   * Account operations
   */
  accounts: {
    /**
     * Search for an account by VAT registration number.
     * Returns the first match or null if none found.
     */
    async searchByVAT(vat: string): Promise<Account | null> {
      const escaped = vat.replace(/'/g, "''");
      const query = buildODataQuery({
        filter: `actum_vatregistrationnumber eq '${escaped}'`,
        select: ['accountid', 'name', 'actum_vatregistrationnumber'],
        top: 1,
      });
      try {
        const response = await apiClient.odata<{ value: Account[] }>(`/accounts${query}`);
        return response.value?.[0] ?? null;
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return null;
        }
        throw error;
      }
    },

    /**
     * Create a new Account record.
     * Uses Prefer: return=representation to get the created record back.
     */
    async create(fields: Omit<Account, 'accountid'>): Promise<Account> {
      const response = await apiClient.odata<Account>('/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(fields),
      });
      return response;
    },

    /**
     * Set the primary contact on an existing Account.
     */
    async setPrimaryContact(accountId: string, contactId: string): Promise<void> {
      await apiClient.odata(`/accounts(${accountId})`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': '*',
        },
        body: JSON.stringify({
          'primarycontactid@odata.bind': `/contacts(${contactId})`,
        }),
      });
    },
  },

  /**
   * Brand lookup operations
   */
  brands: {
    async getAll(): Promise<Brand[]> {
      try {
        const query = buildODataQuery({
          select: ['actum_brandId', 'actum_name'],
          orderby: 'actum_name asc',
        });
        const response = await apiClient.odata<{ value: Brand[] }>(`/actum_brands${query}`);
        return response.value ?? [];
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return [];
        }
        throw error;
      }
    },
  },

  /**
   * Country lookup operations
   */
  countries: {
    async getAll(): Promise<Country[]> {
      try {
        const query = buildODataQuery({
          select: ['actum_countryId', 'actum_name'],
          orderby: 'actum_name asc',
        });
        const response = await apiClient.odata<{ value: Country[] }>(`/actum_countries${query}`);
        return response.value ?? [];
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return [];
        }
        throw error;
      }
    },
  },

  /**
   * Document operations
   */
  documents: {
    /**
     * Get documents with optional filtering
     */
    async getAll(filters?: DocumentFilters): Promise<ClientDocument[]> {
      // Build filter string
      const filterParts: string[] = [];

      if (filters?.accountId) {
        filterParts.push(`_actum_account_value eq ${filters.accountId}`);
      }
      if (filters?.status !== undefined) {
        filterParts.push(`statecode eq ${filters.status}`);
      }
      if (filters?.searchText) {
        // OData contains() function for case-insensitive search
        const sanitized = filters.searchText.replace(/'/g, "''"); // Escape single quotes
        filterParts.push(`contains(tolower(actum_name), tolower('${sanitized}'))`);
      }

      const query = buildODataQuery({
        expand: [
          'actum_account($select=accountid,name)',
          'actum_referencedocument', // Structure to be determined
        ],
        filter: filterParts.join(' and ') || undefined,
        orderby: 'createdon desc',
        top: 100,
      });

      const response = await apiClient.odata<{ value: ClientDocument[] }>(
        `/actum_clientdocuments${query}`
      );

      // Log first document's expanded data for debugging
      if (response.value?.length) {
        console.log('Sample document with expanded data:', response.value[0]);
        if (response.value[0].actum_referencedocument) {
          console.log('actum_referencedocument structure:', response.value[0].actum_referencedocument);
        }
      }

      return response.value || [];
    },

    /**
     * Get single document by ID
     */
    async getById(id: string): Promise<ClientDocument> {
      const query = buildODataQuery({
        expand: [
          'actum_account($select=accountid,name)',
          'actum_referencedocument',
        ],
      });

      return apiClient.odata<ClientDocument>(`/actum_clientdocuments(${id})${query}`);
    },
  },
};
