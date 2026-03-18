/**
 * Dataverse Web API service layer
 * Handles all CRUD operations for Dataverse entities
 */

import { apiClient, ApiError } from './apiClient';
import type { Contact } from '../types/contact';
import type { Account } from '../types/account';
import type { Brand } from '../types/brand';
import type { Country } from '../types/country';
import type { Language } from '../types/language';
import type { Role } from '../types/role';
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
          // Custom fields that exist on Contact table
          'actum_approvalstatus',
          '_actum_languageid_value',
          '_parentcustomerid_value',  // Account lookup
          'mspp_userpreferredlcid',
          // Address fields on Contact
          'address1_line1',
          'address1_city',
          'address1_postalcode',
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
      if (config.devMode) {
        return {
          accountid: "mock-account-001",
          name: "Actum Digital",
          actum_vatregistrationnumber: vat,
          telephone1: "+33 1 00 00 00 00",
          address1_line1: "1 rue de la Paix, 75001 Paris",
          _actum_primarycountryid_value: "mock-country-002",
        };
      }

      const escaped = vat.replace(/'/g, "''");
      const query = buildODataQuery({
        filter: `actum_vatregistrationnumber eq '${escaped}'`,
        select: ['accountid', 'name', '_actum_primarycountryid_value'],
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
   * Language lookup operations
   */
  languages: {
    async getAll(): Promise<Language[]> {
      if (config.devMode) {
        return [
          {
            actum_languageid: "mock-lang-001",
            actum_name: "Dutch",
            actum_code: "nl-NL",
            actum_iso6391: "nl",
            actum_lcid: 1043,
            actum_isdefault: false,
          },
          {
            actum_languageid: "mock-lang-002",
            actum_name: "French",
            actum_code: "fr-FR",
            actum_iso6391: "fr",
            actum_lcid: 1036,
            actum_isdefault: true,
          },
          {
            actum_languageid: "mock-lang-003",
            actum_name: "English",
            actum_code: "en-GB",
            actum_iso6391: "en",
            actum_lcid: 2057,
            actum_isdefault: false,
          },
        ];
      }

      try {
        const query = buildODataQuery({
          select: ['actum_languageid', 'actum_name', 'actum_code', 'actum_iso6391', 'actum_lcid', 'actum_isdefault'],
          filter: 'statecode eq 0',
          orderby: 'actum_name asc',
        });
        const response = await apiClient.odata<{ value: Language[] }>(`/actum_languages${query}`);
        return response.value ?? [];
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return [];
        }
        throw error;
      }
    },

    /**
     * Get languages linked to a specific country via the M2M relationship
     * actum_country_actum_language_actum_language.
     */
    async getByCountry(countryId: string): Promise<Language[]> {
      if (config.devMode) {
        const mockLanguagesByCountry: Record<string, Language[]> = {
          "mock-country-001": [
            // Belgium
            {
              actum_languageid: "mock-lang-001",
              actum_name: "Dutch",
              actum_code: "nl-NL",
              actum_iso6391: "nl",
              actum_lcid: 1043,
              actum_isdefault: false,
            },
            {
              actum_languageid: "mock-lang-002",
              actum_name: "French",
              actum_code: "fr-FR",
              actum_iso6391: "fr",
              actum_lcid: 1036,
              actum_isdefault: false,
            },
          ],
          "mock-country-002": [
            // France
            {
              actum_languageid: "mock-lang-002",
              actum_name: "French",
              actum_code: "fr-FR",
              actum_iso6391: "fr",
              actum_lcid: 1036,
              actum_isdefault: true,
            },
          ],
          "mock-country-003": [
            // Netherlands
            {
              actum_languageid: "mock-lang-001",
              actum_name: "Dutch",
              actum_code: "nl-NL",
              actum_iso6391: "nl",
              actum_lcid: 1043,
              actum_isdefault: true,
            },
          ],
        };
        return mockLanguagesByCountry[countryId] ?? [];
      }

      try {
        const query = buildODataQuery({
          select: ['actum_languageid', 'actum_name', 'actum_code', 'actum_iso6391', 'actum_lcid', 'actum_isdefault'],
          orderby: 'actum_name asc',
        });
        const response = await apiClient.odata<{ value: Language[] }>(
          `/actum_countries(${countryId})/actum_country_actum_language_actum_language${query}`
        );
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
   * Brand lookup operations
   */
  brands: {
    async getAll(): Promise<Brand[]> {
      if (config.devMode) {
        return [
          { actum_brandid: "mock-brand-001", actum_name: "VMZINC" },
          { actum_brandid: "mock-brand-002", actum_name: "VM Building Solutions" },
        ];
      }

      try {
        const query = buildODataQuery({
          select: ['actum_brandid', 'actum_name'],
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
   * Role lookup operations
   */
  roles: {
    async getAll(): Promise<Role[]> {
      if (config.devMode) {
        return [
          { actum_roleid: "mock-role-001", actum_name: "Distributor" },
          { actum_roleid: "mock-role-002", actum_name: "Contractor" },
        ];
      }

      try {
        const query = buildODataQuery({
          select: ['actum_roleid', 'actum_name'],
          orderby: 'actum_name asc',
        });
        const response = await apiClient.odata<{ value: Role[] }>(`/actum_roles${query}`);
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
      if (config.devMode) {
        return [
          { actum_countryid: "mock-country-001", actum_name: "Belgium" },
          { actum_countryid: "mock-country-002", actum_name: "France" },
          { actum_countryid: "mock-country-003", actum_name: "Netherlands" },
        ];
      }

      try {
        const query = buildODataQuery({
          select: ['actum_countryid', 'actum_name'],
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
   * Download Log operations
   */
  downloadLogs: {
    /**
     * Create a new download log record
     * Backend flow will populate actum_sastoken field
     */
    async create(contactId: string, documentId: string): Promise<{ actum_downloadlogid: string }> {
      if (config.devMode) {
        return { actum_downloadlogid: `mock-dl-${Date.now()}` };
      }

      // Use special handling for POST that may return 204
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      });

      // Add CSRF token
      const token = await (window as any).shell?.getTokenDeferred?.() || 
                    await fetch('/_layout/tokenhtml', { credentials: 'include' })
                      .then(r => r.text())
                      .then(text => {
                        const doc = new DOMParser().parseFromString(text, 'text/html');
                        const input = doc.querySelector<HTMLInputElement>('input[name="__RequestVerificationToken"]');
                        return input?.value || '';
                      });
      headers.set('__RequestVerificationToken', token);

      const response = await fetch('/_api/actum_downloadlogs', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          'Actum_contactid@odata.bind': `/contacts(${contactId})`,
          'Actum_documentid@odata.bind': `/actum_productdocumentations(${documentId})`,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create download log: ${response.status} - ${error}`);
      }

      // Handle 204 No Content - extract ID from OData-EntityId header
      if (response.status === 204) {
        const entityIdHeader = response.headers.get('OData-EntityId');
        console.log('[DOWNLOAD] 204 response, OData-EntityId header:', entityIdHeader);
        
        if (entityIdHeader) {
          // OData-EntityId format: https://.../_api/actum_downloadlogs(GUID)
          const match = entityIdHeader.match(/actum_downloadlogs\(([a-f0-9-]+)\)/i);
          if (match) {
            return { actum_downloadlogid: match[1] };
          }
        }
        throw new Error('Download log created but ID not found in response headers');
      }

      // Handle 201 Created with body
      const data = await response.json();
      return { actum_downloadlogid: data.actum_downloadlogid };
    },

    /**
     * Get download log by ID to check for SAS token
     * Uses a filter with timestamp to break Power Pages cache
     * (Records updated outside portal don't automatically break cache)
     */
    async getById(downloadLogId: string): Promise<{ actum_sastoken: string | null }> {
      if (config.devMode) {
        return {
          actum_sastoken: "https://example.com/mock-download.pdf?mock-sas-token",
        };
      }

      // Create a filter that's always true but changes each request to break cache
      // Use modifiedon field (datetime) compared with a future timestamp
      const futureTimestamp = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(); // 1 year in future
      const cacheBustFilter = `modifiedon lt '${futureTimestamp}'`; // modifiedon will always be less than future date
      
      const query = buildODataQuery({
        select: ['actum_downloadlogid', 'actum_sastoken'],
        filter: cacheBustFilter, // This breaks the cache while still returning the record
      });
      
      const response = await apiClient.odata<{ actum_sastoken: string | null }>(
        `/actum_downloadlogs(${downloadLogId})${query}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        }
      );
      return response;
    },
  },
};
