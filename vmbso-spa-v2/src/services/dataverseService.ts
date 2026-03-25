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
import type { LandingPageContent, LandingPageCta } from '../types/homePage';
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

        // Add cache-busting filter with current datetime (always false condition)
        const cacheBuster = new Date().toISOString();
        
        const query = buildODataQuery({ 
          select: fields,
          // Temporarily disable $expand to avoid 400 errors
          // expand: [
          //   'actum_languageid($select=actum_languageid,actum_name)',
          //   'parentcustomerid($select=accountid,name)'  // Expand Account for Company Name
          // ],
          filter: `createdon ne ${cacheBuster}`,  // Cache-busting: always unique, never affects results
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
     * Search for an account by VAT registration number using a flow.
     * Returns the account if found, or null if not found.
     */
    async searchByVAT(vat: string): Promise<Account | null> {
      try {
        const response = await apiClient.flow<{ status: string; data: string }>(
          '/_api/cloudflow/v1.0/trigger/b71ed49e-0022-f111-8341-000d3a688605',
          { vatNumber: vat }
        );

        // Handle error status from flow
        if (response?.status === '500') {
          throw new Error(response.data || 'VAT search failed');
        }

        // Handle success with no data (VAT not found)
        if (!response?.data || response.data === '') {
          return null;
        }

        // Parse the JSON string data and return the account
        const account = JSON.parse(response.data) as Account;
        return account;
      } catch (error) {
        // If it's already an Error with a message, rethrow it
        if (error instanceof Error) {
          throw error;
        }
        // Otherwise wrap it
        throw new Error('VAT search failed');
      }
    },

    /**
     * Get an account record by ID.
     * Fetches only the fields needed for the UpdateProfile edit mode.
     */
    async getById(accountId: string): Promise<Account | null> {
      try {
        const query = buildODataQuery({
          select: ['accountid', 'name', 'actum_vatregistrationnumber', '_actum_primarycountryid_value', '_actum_roleid_value'],
        });
        const response = await apiClient.odata<Account>(`/accounts(${accountId})${query}`);
        return response;
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
   * Landing page content (CMS) — one row per language
   */
  landingPageContent: {
    /**
     * Dev-only mock when REACT_APP_DEV_MODE=true (no Dataverse session).
     */
    getMock(): LandingPageContent {
      return {
        actum_landingpagecontentid: '00000000-0000-0000-0000-000000000001',
        actum_name: 'Default landing (dev)',
        actum_greetingstext: 'Hello, {name}!',
        actum_title: 'Welcome to the VMBSO Customer Portal',
        actum_introductiontext:
          'Access your product documentation and resources in one place.',
        actum_heroimageurl: config.assets.loginHeroImage,
        actum_bannerimageurl: config.assets.loginHeroImage,
        actum_bannerimagetext: 'Products',
        actum_bannertitle: 'Explore your documents',
        _actum_languageid_value: undefined,
        statecode: 0,
      };
    },

    /**
     * Fetch the landing page row best matching the user's language, country, role and brands.
     * Each filter uses a null-or-match OData condition so that a null value on the record
     * means "show to all" (same rule as news articles).
     */
    async getForUser(
      languageId?: string,
      countryId?: string,
      roleId?: string,
      brandIds?: string[],
    ): Promise<LandingPageContent | null> {
      if (config.devMode) {
        return this.getMock();
      }

      try {
        const clean = (guid?: string) => guid?.replace(/[{}]/g, '');

        const nullOrMatch = (field: string, guid?: string) => {
          const g = clean(guid);
          return g
            ? `(${field} eq null or ${field} eq ${g})`
            : `${field} eq null`;
        };

        const brandFilter = () => {
          const ids = (brandIds ?? []).map(clean).filter(Boolean) as string[];
          if (!ids.length) return `_actum_brandid_value eq null`;
          const branches = ids.map(id => `_actum_brandid_value eq ${id}`).join(' or ');
          return `(_actum_brandid_value eq null or ${branches})`;
        };

        const conditions = [
          'statecode eq 0',
          nullOrMatch('_actum_languageid_value', languageId),
          nullOrMatch('_actum_countryid_value', countryId),
          nullOrMatch('_actum_roleid_value', roleId),
          brandFilter(),
        ];

        const query = buildODataQuery({
          select: [
            'actum_landingpagecontentid',
            'actum_name',
            'actum_greetingstext',
            'actum_title',
            'actum_introductiontext',
            'actum_heroimageurl',
            'actum_bannerimageurl',
            'actum_bannerimagetext',
            'actum_bannertitle',
            '_actum_languageid_value',
            '_actum_countryid_value',
            '_actum_roleid_value',
            '_actum_brandid_value',
            'statecode',
          ],
          filter: conditions.join(' and '),
          top: 1,
        });

        const response = await apiClient.odata<{ value: LandingPageContent[] }>(
          `/actum_landingpagecontents${query}`
        );

        if (!response.value?.length) {
          console.warn('[landingPageContent] No matching row found for user filters');
          return null;
        }

        return response.value[0];
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return null;
        }
        console.error('Error fetching landing page content:', error);
        throw error;
      }
    },

    /**
     * Fetch CTA buttons linked to a landing page record.
     */
    async getCtasForPage(landingPageId: string): Promise<LandingPageCta[]> {
      try {
        const query = buildODataQuery({
          select: ['actum_calltoactionbuttonid', 'actum_ctatext', 'actum_ctaurl', 'actum_ctatarget'],
          filter: `_actum_landingpageid_value eq ${landingPageId} and statecode eq 0`,
        });
        const response = await apiClient.odata<{ value: Array<{
          actum_calltoactionbuttonid: string;
          actum_ctatext?: string;
          actum_ctaurl?: string;
          actum_ctatarget?: number;
        }> }>(`/actum_calltoactionbuttons${query}`);
        return (response.value ?? []).map(r => ({
          id: r.actum_calltoactionbuttonid,
          text: r.actum_ctatext ?? '',
          url: r.actum_ctaurl ?? '#',
          target: r.actum_ctatarget ?? 182980000,
        }));
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
