/**
 * Dataverse Web API service layer
 * Handles all CRUD operations for Dataverse entities
 */

import { apiClient, ApiError, getCsrfToken } from './apiClient';
import type { Contact } from '../types/contact';
import type { Account } from '../types/account';
import type { Brand } from '../types/brand';
import type { Country } from '../types/country';
import type { Language } from '../types/language';
import type { Role } from '../types/role';
import type { Invoice, InvoiceItem } from '../types/invoice';
import { InvoiceStatusCode } from '../types/invoice';
import type { Reward } from '../types/reward';
import type { LoyaltyTransaction } from '../types/loyaltyTransaction';
import type { Voucher } from '../types/voucher';
import type { LandingPageContent, LandingPageCta } from '../types/homePage';
import type { PublicConfig } from '../types/publicConfig';
import { config } from '../config/powerPages.config';

type FlowArrayResponse<T> = {
  status?: string;
  data?: T[] | string;
  message?: string;
};

type UploadInvoiceArgs = {
  contactId: string;
  accountId: string;
  file: File;
};

/**
 * Thrown when the invoice record was created but the file could not be attached.
 * Carries no user-facing text itself — callers map it to a translated message,
 * since this service layer has no access to i18n.
 */
export class InvoiceAttachError extends Error {
  constructor(cause: unknown) {
    super('Failed to attach file to invoice');
    this.name = 'InvoiceAttachError';
    this.cause = cause;
  }
}

function parseFlowArrayData<T>(response: FlowArrayResponse<T>, entityName: string): T[] {
  if (response?.status === '500') {
    throw new Error(response.message || `Failed to fetch ${entityName}`);
  }

  const payload = response?.data;
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (!Array.isArray(parsed)) {
        throw new Error(`Unexpected ${entityName} data format`);
      }
      return parsed as T[];
    } catch (error) {
      console.error(`Failed to parse ${entityName} flow response:`, error);
      throw new Error(`Failed to parse ${entityName} data`);
    }
  }

  if (!Array.isArray(payload)) {
    throw new Error(`Unexpected ${entityName} data format`);
  }

  return payload;
}

/**
 * HTTP header values must be ISO-8859-1 (Latin-1); characters outside that range
 * (smart quotes, en/em dashes, CJK/Cyrillic/Arabic scripts, emoji, etc.) make the
 * browser throw synchronously when the filename is used as a header value, so
 * upload never reaches the network. Strip/replace anything outside Latin-1 while
 * keeping the name readable and preserving the extension.
 */
function sanitizeFileNameForHeader(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < fileName.length - 1;
  const base = hasExtension ? fileName.slice(0, lastDotIndex) : fileName;
  const extension = hasExtension ? fileName.slice(lastDotIndex) : '';

  /* eslint-disable no-control-regex -- Latin-1/control-char ranges are intentional here */
  const sanitize = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // drop combining diacritics left after NFKD normalization
      .replace(/[^\x00-\xFF]/g, '_') // replace remaining non-Latin-1 chars
      .replace(/[\x00-\x1F\x7F]/g, ''); // strip control characters
  /* eslint-enable no-control-regex */

  const sanitizedBase = sanitize(base).trim() || 'invoice';
  const sanitizedExtension = sanitize(extension);

  return `${sanitizedBase}${sanitizedExtension}`;
}

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
          expand: [
            'actum_languageid($select=actum_languageid,actum_name)'
            // Note: Power Pages does not allow expanding parentcustomerid on Contact
            // We must query the Account table separately using _parentcustomerid_value
          ],
          filter: `createdon ne ${cacheBuster}`,  // Cache-busting: always unique, never affects results
          top: 1
        });

        const response = await apiClient.odata<{ value: Contact[] }>(`/contacts${query}`);

        if (!response.value?.length) {
          console.warn('No contact record found for authenticated user');
          return null;
        }

        const contact = response.value[0];

        // Fetch Account, Role, and Country separately due to Power Pages limitations
        const accountId = contact._parentcustomerid_value;
        
        if (accountId) {
          try {
            // Step 1: Fetch Account with Role/Country lookup IDs
            const accountResponse = await apiClient.odata<Account>(
              `/accounts(${accountId})?$select=accountid,name,_actum_roleid_value,_actum_primarycountryid_value`
            );
            
            contact.parentcustomerid = accountResponse;

            // Step 2: Fetch Role if ID exists
            const roleId = accountResponse._actum_roleid_value;
            if (roleId) {
              const roleResponse = await apiClient.odata<Role>(
                `/actum_roles(${roleId})?$select=actum_roleid,actum_name,actum_uploadinvoicesallowed`
              );
              contact.parentcustomerid.actum_Role = roleResponse;
            }

            // Step 3: Fetch Country if ID exists
            const countryId = accountResponse._actum_primarycountryid_value;
            if (countryId) {
              const countryResponse = await apiClient.odata<Country>(
                `/actum_countries(${countryId})?$select=actum_countryid,actum_name,actum_uploadinvoicesallowed`
              );
              contact.parentcustomerid.actum_Country = countryResponse;
            }
          } catch (error) {
            console.warn('Failed to fetch Account/Role/Country details:', error);
            // Continue without related data
          }
        }

        return contact;
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
     * Get brands linked to an account via the M2M relationship.
     * Nav prop: actum_account_actum_brand_actum_brand
     */
    async getBrands(accountId: string): Promise<Brand[]> {
      try {
        const query = buildODataQuery({
          select: ['actum_brandid', 'actum_name'],
          filter: 'statecode eq 0',
        });
        const response = await apiClient.odata<{ value: Brand[] }>(
          `/accounts(${accountId})/actum_account_actum_brand_actum_brand${query}`
        );
        return response.value ?? [];
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return [];
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
   * Public, non-secret, per-environment runtime config (Entra provider identifier,
   * GA measurement ID, etc.) — read once at app bootstrap. Anonymous-readable, since
   * the login page needs it before authentication.
   */
  publicConfig: {
    async getAll(): Promise<PublicConfig[]> {
      if (config.devMode) {
        return [];
      }

      try {
        const query = buildODataQuery({
          select: ['actum_publicconfigid', 'actum_name', 'actum_value'],
        });
        const response = await apiClient.odata<{ value: PublicConfig[] }>(`/actum_publicconfigs${query}`);
        return response.value ?? [];
      } catch (error) {
        console.error('Error fetching public config:', error);
        return [];
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
          filter: 'statecode eq 0',
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
   * Invoice operations
   */
  invoices: {
    /**
     * Fetch invoices for the current user's account via Power Automate flow.
     * Flow accepts contactId, derives accountId securely, and returns enriched invoices.
     */
    async getByContact(contactId: string): Promise<Invoice[]> {
      if (config.devMode) {
        // Mock data for development with various statuses
        return [
          {
            actum_invoiceid: 'mock-invoice-1',
            actum_invoicenumber: 'VF25/01-15142',
            actum_name: 'Portal Invoice VF25/01-15142',
            statuscode: 182980004, // Rejected
            actum_totalamount: 5175.91,
            actum_totalnetamount: 4300,
            actum_totalvat: 875.91,
            actum_invoicedate: '2025-01-31T00:00:00Z',
            actum_duedate: '2025-02-14T00:00:00Z',
            createdon: '2026-03-30T18:51:47Z',
            actum_distributorname: 'Defrancq Bouwspecialiteiten NV',
            actum_customer: 'VAN SEVEREN N.V., URSELSEWEG 111 A, 9910 KNESSELARE, BE',
            actum_rejectionreason: 'Rejected because the distributor is not on the approved list and the invoice number is duplicated.',
            actum_sharepointfileurl: 'https://vmbso.sharepoint.com/sites/portal-dev/invoices/VF25-01-15142.pdf',
            'actum_totalamount@OData.Community.Display.V1.FormattedValue': '€5,175.91',
            'statuscode@OData.Community.Display.V1.FormattedValue': 'Rejected',
            'actum_invoicedate@OData.Community.Display.V1.FormattedValue': '1/31/2025',
            'uploader.contactid': 'mock-contact-1',
            'uploader.fullname': 'John Doe',
            'uploader.emailaddress1': 'john.doe@example.com',
            'account.accountid': 'mock-account-1',
            'account.name': 'Van Severen N.V.',
          },
          {
            actum_invoiceid: 'mock-invoice-2',
            actum_invoicenumber: 'VF25/02-18500',
            actum_name: 'Portal Invoice VF25/02-18500',
            statuscode: 182980005, // Credited (changed from 182980002)
            actum_totalamount: 11479.78,
            actum_totalnetamount: 9537.08,
            actum_totalvat: 1942.7,
            actum_invoicedate: '2025-02-15T00:00:00Z',
            actum_duedate: '2025-03-15T00:00:00Z',
            createdon: '2026-03-31T18:36:11Z',
            actum_distributorname: 'ABC Building Materials Ltd',
            actum_customer: 'Test Company BV, Main Street 123, 1000 Brussels, BE',
            actum_rejectionreason: null,
            actum_sharepointfileurl: 'https://vmbso.sharepoint.com/sites/portal-dev/invoices/VF25-02-18500.pdf',
            actum_loaltypointsgranted: 850,
            'actum_totalamount@OData.Community.Display.V1.FormattedValue': '€11,479.78',
            'statuscode@OData.Community.Display.V1.FormattedValue': 'Credited',
            'actum_invoicedate@OData.Community.Display.V1.FormattedValue': '2/15/2025',
            'uploader.contactid': 'mock-contact-2',
            'uploader.fullname': 'Jane Smith',
            'uploader.emailaddress1': 'jane.smith@example.com',
            'account.accountid': 'mock-account-2',
            'account.name': 'Test Company BV',
          },
          {
            actum_invoiceid: 'mock-invoice-3',
            actum_invoicenumber: 'VF25/03-24001',
            actum_name: 'Portal Invoice VF25/03-24001',
            statuscode: 182980002, // Extracted
            actum_totalamount: 3250.50,
            actum_totalnetamount: 2700,
            actum_totalvat: 550.50,
            actum_invoicedate: '2025-03-10T00:00:00Z',
            actum_duedate: '2025-04-10T00:00:00Z',
            createdon: '2026-04-01T09:15:22Z',
            actum_distributorname: 'Construction Supplies Inc',
            actum_customer: 'Another Company SA, Industrial Park 45, 2000 Antwerp, BE',
            actum_rejectionreason: null,
            actum_sharepointfileurl: 'https://vmbso.sharepoint.com/sites/portal-dev/invoices/VF25-03-24001.pdf',
            'actum_totalamount@OData.Community.Display.V1.FormattedValue': '€3,250.50',
            'statuscode@OData.Community.Display.V1.FormattedValue': 'Processed',
            'actum_invoicedate@OData.Community.Display.V1.FormattedValue': '3/10/2025',
            'uploader.contactid': 'mock-contact-1',
            'uploader.fullname': 'John Doe',
            'uploader.emailaddress1': 'john.doe@example.com',
            'account.accountid': 'mock-account-1',
            'account.name': 'Van Severen N.V.',
          },
          {
            actum_invoiceid: 'mock-invoice-4',
            actum_invoicenumber: 'VF25/04-30245',
            actum_name: 'Portal Invoice VF25/04-30245',
            statuscode: 182980005, // Credited (changed from Approved)
            actum_totalamount: 8900.00,
            actum_totalnetamount: 7400,
            actum_totalvat: 1500,
            actum_invoicedate: '2025-04-05T00:00:00Z',
            actum_duedate: '2025-05-05T00:00:00Z',
            createdon: '2026-04-05T14:42:10Z',
            actum_distributorname: 'Premium Building Solutions',
            actum_customer: 'Big Client NV, Business Avenue 789, 9000 Ghent, BE',
            actum_rejectionreason: null,
            actum_sharepointfileurl: 'https://vmbso.sharepoint.com/sites/portal-dev/invoices/VF25-04-30245.pdf',
            actum_loaltypointsgranted: 650,
            'actum_totalamount@OData.Community.Display.V1.FormattedValue': '€8,900.00',
            'statuscode@OData.Community.Display.V1.FormattedValue': 'Credited',
            'actum_invoicedate@OData.Community.Display.V1.FormattedValue': '4/5/2025',
            'uploader.contactid': 'mock-contact-3',
            'uploader.fullname': 'Alice Johnson',
            'uploader.emailaddress1': 'alice.johnson@example.com',
            'account.accountid': 'mock-account-3',
            'account.name': 'Big Client NV',
          },
          {
            actum_invoiceid: 'mock-invoice-5',
            actum_invoicenumber: 'VF25/04-35890',
            actum_name: 'Portal Invoice VF25/04-35890',
            statuscode: 182980004, // Rejected
            actum_totalamount: 27346.00,
            actum_totalnetamount: 22718.00,
            actum_totalvat: 4628.00,
            actum_invoicedate: '2025-04-12T00:00:00Z',
            actum_duedate: '2025-05-12T00:00:00Z',
            createdon: '2026-04-12T11:20:33Z',
            actum_distributorname: 'Unknown Supplier',
            actum_customer: 'Small Business BVBA, Rural Road 12, 3500 Hasselt, BE',
            actum_rejectionreason: 'Rejected because the invoice amount exceeds the approved account limit.',
            actum_sharepointfileurl: 'https://vmbso.sharepoint.com/sites/portal-dev/invoices/VF25-04-35890.pdf',
            'actum_totalamount@OData.Community.Display.V1.FormattedValue': '€27,346.00',
            'statuscode@OData.Community.Display.V1.FormattedValue': 'Rejected',
            'actum_invoicedate@OData.Community.Display.V1.FormattedValue': '4/12/2025',
            'uploader.contactid': 'mock-contact-2',
            'uploader.fullname': 'Jane Smith',
            'uploader.emailaddress1': 'jane.smith@example.com',
            'account.accountid': 'mock-account-4',
            'account.name': 'Small Business BVBA',
          },
        ];
      }

      if (!contactId) {
        return [];
      }

      if (!config.flows.fetchInvoices || config.flows.fetchInvoices === 'TODO: add endpoint') {
        throw new Error('Invoice fetch flow URL is not configured.');
      }

      try {
        // Use apiClient.flow() which handles the proper content-type and format
        const response = await apiClient.flow<FlowArrayResponse<Invoice>>(config.flows.fetchInvoices, {});

        // Flow returns { status: "Success", data: "[...]" } where data is a JSON string
        if (response?.status === 'Success' || response?.status === '200') {
          const invoices = parseFlowArrayData(response, 'invoices');
          return invoices;
        } else if (response?.status === '500') {
          throw new Error(response.message || 'Failed to fetch invoices');
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }
    },

    /**
     * Fetch invoices from Dataverse using OData.
     * Tries likely table names because table logical name can vary by environment.
     */
    async getAll(): Promise<Invoice[]> {
      if (config.devMode) {
        return [];
      }

      const query = buildODataQuery({
        select: [
          'actum_invoicenumber',
          'actum_creditpoints',
          'actum_status',
          'statuscode',
          'actum_account',
          'actum_contact',
          '_actum_accountid_value',
          '_actum_contactid_value',
        ],
        orderby: 'createdon desc',
      });

      try {
        const response = await apiClient.odata<{ value: Invoice[] }>(`/actum_invoices${query}`, {
          headers: {
            Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
          },
        });

        return response.value ?? [];
      } catch (error) {
        throw error;
      }
    },

    /**
     * Upload an invoice using direct OData (2-step process):
     * 1. Create invoice record with contact/account references
     * 2. Upload file to actum_invoicedocument file column
     */
    async uploadInvoice({ contactId, accountId, file }: UploadInvoiceArgs): Promise<Invoice> {
      const token = await getCsrfToken();

      console.log('[UPLOAD SERVICE] Step 1: Creating invoice record...');
      
      // Step 1: Create invoice record
      const createResponse = await fetch(config.api.invoices, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          __RequestVerificationToken: token,
          'x-requested-with': 'XMLHttpRequest',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          'actum_Contact@odata.bind': `/contacts(${contactId})`,
          'actum_Account@odata.bind': `/accounts(${accountId})`,
        }),
      });

      if (!createResponse.ok) {
        const details = await createResponse.text().catch(() => '');
        console.error('[UPLOAD SERVICE] Step 1 failed:', createResponse.status, details);
        throw new Error(`Failed to create invoice record: ${createResponse.status}${details ? ` - ${details}` : ''}`);
      }

      console.log('[UPLOAD SERVICE] Step 1 response status:', createResponse.status);
      console.log('[UPLOAD SERVICE] Step 1 response headers:', Object.fromEntries(createResponse.headers.entries()));

      let createdInvoice: Invoice;
      let invoiceId: string;

      // Handle both 200 OK with JSON body and 204 No Content with OData-EntityId header
      if (createResponse.status === 204 || createResponse.headers.get('content-length') === '0') {
        // No content returned, extract ID from OData-EntityId header
        const entityIdHeader = createResponse.headers.get('OData-EntityId');
        console.log('[UPLOAD SERVICE] No content in response, using OData-EntityId header:', entityIdHeader);
        
        if (!entityIdHeader) {
          console.error('[UPLOAD SERVICE] No OData-EntityId header found');
          throw new Error('Invoice created but no ID returned (no OData-EntityId header)');
        }

        // Extract GUID from URL like: https://.../_api/actum_invoices(12345678-1234-1234-1234-123456789012)
        const idMatch = entityIdHeader.match(/\(([a-f0-9-]+)\)/i);
        if (!idMatch || !idMatch[1]) {
          console.error('[UPLOAD SERVICE] Could not extract ID from header:', entityIdHeader);
          throw new Error('Could not extract invoice ID from OData-EntityId header');
        }

        invoiceId = idMatch[1];
        console.log('[UPLOAD SERVICE] Extracted invoice ID:', invoiceId);
        
        // Create minimal invoice object
        createdInvoice = {
          actum_invoiceid: invoiceId,
          statuscode: 1, // Draft
          createdon: new Date().toISOString(),
        };
      } else {
        // JSON response expected
        try {
          createdInvoice = await createResponse.json() as Invoice;
          invoiceId = createdInvoice.actum_invoiceid;
        } catch (error) {
          console.error('[UPLOAD SERVICE] Failed to parse JSON response:', error);
          throw new Error('Failed to parse create invoice response as JSON');
        }
      }

      if (!invoiceId) {
        console.error('[UPLOAD SERVICE] No invoice ID available');
        throw new Error('Invoice created but no ID returned');
      }

      console.log('[UPLOAD SERVICE] Step 1 success. Invoice ID:', invoiceId);
      console.log('[UPLOAD SERVICE] Step 2: Uploading file to invoice...');
      console.log('[UPLOAD SERVICE] File details:', { name: file.name, type: file.type, size: file.size });

      // Step 2: Upload file to the file column
      const uploadUrl = `${config.api.invoices}(${invoiceId})/actum_invoicedocument`;
      const safeFileName = sanitizeFileNameForHeader(file.name);

      try {
        const fileBytes = await file.arrayBuffer();

        console.log('[UPLOAD SERVICE] Upload URL:', uploadUrl);
        console.log('[UPLOAD SERVICE] Sanitized file name for header:', safeFileName);

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/octet-stream',
            __RequestVerificationToken: token,
            'x-requested-with': 'XMLHttpRequest',
            'x-ms-file-name': safeFileName,
          },
          body: fileBytes,
        });

        console.log('[UPLOAD SERVICE] Step 2 response status:', uploadResponse.status);

        if (!uploadResponse.ok) {
          const details = await uploadResponse.text().catch(() => '');
          throw new Error(`Failed to upload file: ${uploadResponse.status}${details ? ` - ${details}` : ''}`);
        }

        console.log('[UPLOAD SERVICE] Step 2 success. File uploaded.');
      } catch (uploadError) {
        console.error('[UPLOAD SERVICE] Step 2 failed, marking invoice record as canceled:', invoiceId, uploadError);

        // The invoice record from Step 1 has no file attached. The portal contact only has
        // write (not delete) permission on this table, so mark it canceled rather than
        // leaving it as an invisible, permanently-incomplete "draft" — this also avoids
        // granting delete access, which would let users remove already-submitted invoices.
        try {
          await fetch(`${config.api.invoices}(${invoiceId})`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              __RequestVerificationToken: token,
              'x-requested-with': 'XMLHttpRequest',
            },
            body: JSON.stringify({ statuscode: InvoiceStatusCode.CANCELED }),
          });
        } catch (cleanupError) {
          console.error('[UPLOAD SERVICE] Failed to mark invoice record as canceled:', invoiceId, cleanupError);
        }

        throw new InvoiceAttachError(uploadError);
      }

      // Return the created invoice
      return createdInvoice;
    },

    /**
     * Fetch point-earning invoice lines for a specific invoice via Power Automate flow.
     * Only returns lines where actum_loaltypointsgranted > 0.
     */
    async getItemsByInvoice(invoiceId: string, contactId: string): Promise<InvoiceItem[]> {
      if (config.devMode) {
        return [
          {
            actum_invoiceitemid: 'mock-item-1',
            actum_name: 'RESITRIX SKW FULL BOND 1X10M',
            actum_loaltypointsgranted: 1200,
            'actum_loaltypointsgranted@OData.Community.Display.V1.FormattedValue': '1,200',
          },
          {
            actum_invoiceitemid: 'mock-item-2',
            actum_name: 'VM ZINK MEMBRAAN MET KLEEFSTROOK 75m²/rol',
            actum_loaltypointsgranted: 450,
            'actum_loaltypointsgranted@OData.Community.Display.V1.FormattedValue': '450',
          },
        ];
      }

      if (!invoiceId || !contactId) {
        return [];
      }

      try {
        const response = await apiClient.flow<FlowArrayResponse<InvoiceItem>>(config.flows.getInvoiceItems, {
          invoiceId,
        });

        return parseFlowArrayData(response, 'invoice items');
      } catch (error) {
        console.error('Error fetching invoice items:', error);
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
          'statecode eq 1',
          'statuscode eq 182980001',
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
     * Fetch CTA buttons linked to a landing page record via M2M $expand.
     * Nav prop: actum_CallToActionButton_actum_LandingPageContent_actum_LandingPageContent
     */
    async getCtasForPage(landingPageId: string): Promise<LandingPageCta[]> {
      const CTA_NAV_PROP = 'actum_CallToActionButton_actum_LandingPageContent_actum_LandingPageContent';
      try {
        const url = `/actum_landingpagecontents(${landingPageId})?$select=actum_landingpagecontentid&$expand=${CTA_NAV_PROP}($select=actum_calltoactionbuttonid,actum_ctatext,actum_ctaurl,actum_ctatarget;$filter=statecode eq 0)`;
        const response = await apiClient.odata<{
          actum_landingpagecontentid: string;
          [key: string]: Array<{
            actum_calltoactionbuttonid: string;
            actum_ctatext?: string;
            actum_ctaurl?: string;
            actum_ctatarget?: number;
          }> | string;
        }>(url);
        const ctas = (response[CTA_NAV_PROP] ?? []) as Array<{
          actum_calltoactionbuttonid: string;
          actum_ctatext?: string;
          actum_ctaurl?: string;
          actum_ctatarget?: number;
        }>;
        return ctas.map(r => ({
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

  /**
   * Rewards operations
   */
  rewards: {
    /**
     * Fetch active rewards catalog
     */
    async getCatalog(): Promise<Reward[]> {
      if (config.devMode) {
        // Mock data for development
        return [
          {
            actum_rewardid: 'mock-reward-1',
            actum_name: '€10 Coffee Gift Card',
            actum_description: 'Enjoy a €10 gift card redeemable at popular coffee shops and cafés',
            actum_pointamount: 100,
            statecode: 0,
            statuscode: 1,
            createdon: '2026-01-01T00:00:00Z',
            modifiedon: '2026-01-01T00:00:00Z',
          },
          {
            actum_rewardid: 'mock-reward-2',
            actum_name: '€25 Restaurant Voucher',
            actum_description: 'Dine out with a €25 voucher valid at participating restaurants',
            actum_pointamount: 250,
            statecode: 0,
            statuscode: 1,
            createdon: '2026-01-01T00:00:00Z',
            modifiedon: '2026-01-01T00:00:00Z',
          },
          {
            actum_rewardid: 'mock-reward-3',
            actum_name: 'Premium Tool Set Discount',
            actum_description: '€50 discount on professional construction tools and equipment',
            actum_pointamount: 500,
            statecode: 0,
            statuscode: 1,
            createdon: '2026-01-01T00:00:00Z',
            modifiedon: '2026-01-01T00:00:00Z',
          },
          {
            actum_rewardid: 'mock-reward-4',
            actum_name: 'Training Workshop Pass',
            actum_description: 'Free admission to a professional development training workshop',
            actum_pointamount: 750,
            statecode: 0,
            statuscode: 1,
            createdon: '2026-01-01T00:00:00Z',
            modifiedon: '2026-01-01T00:00:00Z',
          },
          {
            actum_rewardid: 'mock-reward-5',
            actum_name: '€100 Equipment Voucher',
            actum_description: '€100 voucher for specialized building materials and equipment',
            actum_pointamount: 1000,
            statecode: 0,
            statuscode: 1,
            createdon: '2026-01-01T00:00:00Z',
            modifiedon: '2026-01-01T00:00:00Z',
          },
          {
            actum_rewardid: 'mock-reward-6',
            actum_name: 'Annual Conference Ticket',
            actum_description: 'Complimentary ticket to the annual industry conference and expo',
            actum_pointamount: 1500,
            statecode: 0,
            statuscode: 1,
            createdon: '2026-01-01T00:00:00Z',
            modifiedon: '2026-01-01T00:00:00Z',
          },
          {
            actum_rewardid: 'mock-reward-7',
            actum_name: '€250 Premium Package',
            actum_description: 'Exclusive package with high-value tools, materials, and bonus items',
            actum_pointamount: 2500,
            statecode: 0,
            statuscode: 1,
            createdon: '2026-01-01T00:00:00Z',
            modifiedon: '2026-01-01T00:00:00Z',
          },
        ];
      }

      try {
        const query = buildODataQuery({
          select: ['actum_rewardid', 'actum_name', 'actum_description', 'actum_pointamount', 'statecode', 'statuscode'],
          filter: 'statecode eq 0', // Active only
          orderby: 'actum_pointamount asc', // Lowest cost first
        });

        const response = await apiClient.odata<{ value: Reward[] }>(
          `/actum_rewards${query}`
        );
        
        return response.value ?? [];
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return [];
        }
        throw error;
      }
    },

    /**
     * Fetch loyalty points balance for an account
     * Calculates: SUM(credits) - SUM(debits) from active transactions
     */
    async getBalance(accountId: string): Promise<number> {
      if (config.devMode) {
        // Mock balance for development
        return 1500;
      }

      if (!accountId) {
        return 0;
      }

      try {
        // Cache-busting: use a timestamp that changes each request
        const futureTimestamp = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
        
        const query = buildODataQuery({
          select: ['actum_loyaltypoints', 'actum_transactiontype'],
          filter: `_actum_account_value eq ${accountId} and statecode eq 0 and modifiedon lt '${futureTimestamp}'`, // Active transactions only + cache buster
        });

        const response = await apiClient.odata<{ value: LoyaltyTransaction[] }>(
          `/actum_loyaltytransactions${query}`,
          {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          }
        );

        const transactions = response.value ?? [];

        // Calculate balance: credits (type=1) minus debits (type=2)
        const credits = transactions
          .filter(t => t.actum_transactiontype === 1) // Addition
          .reduce((sum, t) => sum + (t.actum_loyaltypoints || 0), 0);

        const debits = transactions
          .filter(t => t.actum_transactiontype === 2) // Deletion
          .reduce((sum, t) => sum + (t.actum_loyaltypoints || 0), 0);

        return credits - debits;
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          return 0;
        }
        throw error;
      }
    },

    /**
     * Submit reward claim via Power Automate flow
     * Flow validates balance, creates transactions, and generates vouchers
     */
    async claimRewards(data: {
      accountId: string;
      contactId: string;
      pointAmount: number;
      rewards: Array<{ rewardId: string; quantity: number }>;
    }): Promise<{
      status: string;
      balance?: number;
      items?: Array<Array<{ rewardId: string; voucherCode: string }>>;
    }> {
      if (config.devMode) {
        // Mock successful claim in dev mode
        return {
          status: 'success',
          balance: 1500 - data.pointAmount,
          items: [
            data.rewards.map(r => ({
              rewardId: r.rewardId,
              voucherCode: `DEV-${Math.random().toString(36).substring(7).toUpperCase()}`,
            })),
          ],
        };
      }

      try {
        // Construct the request payload with rewardsJson as a JSON string
        const rewardsJson = JSON.stringify({
          accountId: data.accountId,
          contactId: data.contactId,
          pointAmount: data.pointAmount,
          rewards: data.rewards,
        });

        // Use apiClient.flow() which sends eventData with rewardsJson nested inside
        const response = await apiClient.flow<{ resultjson: string }>(config.flows.claimRewards, {
          rewardsJson,
        });

        // Parse the resultjson string to get the actual result
        const result = JSON.parse(response.resultjson) as {
          status: string;
          balance?: number;
          items?: Array<Array<{ rewardId: string; voucherCode: string }>>;
        };

        return result;
      } catch (error) {
        console.error('Error claiming rewards:', error);
        throw error;
      }
    },
  },

  /**
   * Loyalty transaction operations
   */
  loyaltyTransactions: {
    /**
     * Fetch all loyalty transactions for an account (for transaction history display)
     */
    async getByAccount(accountId: string): Promise<LoyaltyTransaction[]> {
      if (config.devMode) {
        return [
          {
            actum_loyaltytransactionid: 'mock-tx-1',
            actum_name: 'Invoice VF25/02-18500',
            actum_loyaltypoints: 850,
            actum_transactiontype: 1,
            actum_description: 'Points earned from invoice VF25/02-18500',
            actum_portalmessage: 'Points earned from invoice VF25/02-18500',
            actum_expirationdate: null,
            _actum_account_value: 'mock-account-1',
            _actum_invoice_value: 'mock-invoice-2',
            statecode: 0,
            statuscode: 1,
            createdon: '2026-03-31T18:36:11Z',
            modifiedon: '2026-03-31T18:36:11Z',
          },
          {
            actum_loyaltytransactionid: 'mock-tx-2',
            actum_name: 'Invoice VF25/04-30245',
            actum_loyaltypoints: 650,
            actum_transactiontype: 1,
            actum_description: 'Points earned from invoice VF25/04-30245',
            actum_portalmessage: 'Points earned from invoice VF25/04-30245',
            actum_expirationdate: null,
            _actum_account_value: 'mock-account-1',
            _actum_invoice_value: 'mock-invoice-4',
            statecode: 0,
            statuscode: 1,
            createdon: '2026-04-05T14:42:10Z',
            modifiedon: '2026-04-05T14:42:10Z',
          },
          {
            actum_loyaltytransactionid: 'mock-tx-3',
            actum_name: 'Reward Claim - €25 Restaurant Voucher',
            actum_loyaltypoints: 250,
            actum_transactiontype: 2,
            actum_description: 'Points spent on €25 Restaurant Voucher',
            actum_portalmessage: 'Points spent on €25 Restaurant Voucher',
            actum_expirationdate: null,
            _actum_account_value: 'mock-account-1',
            _actum_invoice_value: null,
            statecode: 0,
            statuscode: 1,
            createdon: '2026-04-10T09:30:00Z',
            modifiedon: '2026-04-10T09:30:00Z',
          },
        ];
      }

      if (!accountId) {
        return [];
      }

      try {
        const query = buildODataQuery({
          select: [
            'actum_loyaltytransactionid',
            'actum_name',
            'actum_loyaltypoints',
            'actum_transactiontype',
            'actum_portalmessage',
            'statecode',
            'statuscode',
            'createdon',
          ],
          filter: `_actum_account_value eq ${accountId} and statecode eq 0`,
          orderby: 'createdon desc',
        });

        const response = await apiClient.odata<{ value: LoyaltyTransaction[] }>(
          `/actum_loyaltytransactions${query}`,
          {
            headers: {
              Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
            },
          }
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
   * Voucher operations
   */
  vouchers: {
    /**
     * Get all vouchers for a specific Account
     * - For installers: Returns vouchers where actum_account = accountId
     * - For distributors: Returns vouchers where actum_distributorid = accountId
     * @param accountId - Account GUID
     * @returns Array of vouchers with expanded Contact and Reward info
     */
    async getByAccount(accountId: string, role: 'installer' | 'distributor' = 'installer'): Promise<Voucher[]> {
      if (config.devMode) {
        // Dev mode: mock vouchers branched by role to mirror the two-FetchXML flow design.
        // Installer sees: claimedBy contact name (peer) + distributorAccount name only.
        // Distributor sees: installerAccount name only + redeemedBy contact name (peer).
        if (role === 'distributor') {
          return [
            {
              actum_voucherid: 'voucher-002',
              actum_name: 'Reward Voucher 202603201145',
              actum_vouchercode: 'AB12CD34EF',
              actum_expirationdate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
              _actum_account_value: 'installer-account-001',
              _actum_contactid_value: 'contact-002',
              _actum_loyaltytransaction_value: 'transaction-002',
              _actum_rewardclaimlineid_value: 'claimline-002',
              _actum_redeemedby_value: 'contact-dist-001',
              _actum_distributorid_value: accountId,
              statecode: 0,
              statuscode: 182980002, // Redeemed
              createdon: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              modifiedon: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              actum_redeemedon: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              'installerAccount.name': 'PePe Roofing BVBA',
              'redeemedBy.fullname': 'Marc Dubois',
              'reward.name': 'Premium Tool Set',
              'reward.pointamount': 500,
            },
            {
              actum_voucherid: 'voucher-005',
              actum_name: 'Reward Voucher 202604011200',
              actum_vouchercode: 'LMNOP78901',
              actum_expirationdate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
              _actum_account_value: 'installer-account-002',
              _actum_contactid_value: 'contact-001',
              _actum_loyaltytransaction_value: 'transaction-005',
              _actum_rewardclaimlineid_value: 'claimline-005',
              _actum_redeemedby_value: 'contact-dist-002',
              _actum_distributorid_value: accountId,
              statecode: 0,
              statuscode: 182980002, // Redeemed
              createdon: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              modifiedon: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              actum_redeemedon: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              'installerAccount.name': 'Vandenberghe Dak NV',
              'redeemedBy.fullname': 'Sophie Lecomte',
              'reward.name': 'Safety Kit XL',
              'reward.pointamount': 300,
            },
          ];
        }

        // Installer mock data
        return [
          {
            actum_voucherid: 'voucher-001',
            actum_name: 'Reward Voucher 202603261301',
            actum_vouchercode: 'DEEF25161B',
            actum_expirationdate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            _actum_account_value: accountId,
            _actum_contactid_value: 'contact-001',
            _actum_loyaltytransaction_value: 'transaction-001',
            _actum_rewardclaimlineid_value: 'claimline-001',
            _actum_redeemedby_value: null,
            _actum_distributorid_value: null,
            statecode: 0,
            statuscode: 182980001, // Issued
            createdon: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            modifiedon: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            actum_redeemedon: null,
            'claimedBy.fullname': 'Lotte De Smet',
            'distributorAccount.name': null,
            'reward.name': 'Premium Tool Set',
            'reward.pointamount': 500,
          },
          {
            actum_voucherid: 'voucher-002',
            actum_name: 'Reward Voucher 202603201145',
            actum_vouchercode: 'AB12CD34EF',
            actum_expirationdate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            _actum_account_value: accountId,
            _actum_contactid_value: 'contact-002',
            _actum_loyaltytransaction_value: 'transaction-002',
            _actum_rewardclaimlineid_value: 'claimline-002',
            _actum_redeemedby_value: 'contact-dist-001',
            _actum_distributorid_value: 'dist-account-001',
            statecode: 0,
            statuscode: 182980002, // Redeemed
            createdon: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            modifiedon: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            actum_redeemedon: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            'claimedBy.fullname': 'Bram Van den Broeck',
            'distributorAccount.name': 'Good Distributor Ltd',
            'reward.name': 'Safety Kit XL',
            'reward.pointamount': 300,
          },
          {
            actum_voucherid: 'voucher-003',
            actum_name: 'Reward Voucher 202602150930',
            actum_vouchercode: 'XYZ9876543',
            actum_expirationdate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            _actum_account_value: accountId,
            _actum_contactid_value: 'contact-001',
            _actum_loyaltytransaction_value: 'transaction-003',
            _actum_rewardclaimlineid_value: 'claimline-003',
            _actum_redeemedby_value: null,
            _actum_distributorid_value: null,
            statecode: 1,
            statuscode: 182980003, // Expired
            createdon: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            modifiedon: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            actum_redeemedon: null,
            'claimedBy.fullname': 'Lotte De Smet',
            'distributorAccount.name': null,
            'reward.name': 'Workshop Voucher',
            'reward.pointamount': 250,
          },
          {
            actum_voucherid: 'voucher-004',
            actum_name: 'Reward Voucher 202604101500',
            actum_vouchercode: 'ASDF456789',
            actum_expirationdate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            _actum_account_value: accountId,
            _actum_contactid_value: 'contact-002',
            _actum_loyaltytransaction_value: 'transaction-006',
            _actum_rewardclaimlineid_value: 'claimline-006',
            _actum_redeemedby_value: null,
            _actum_distributorid_value: null,
            statecode: 0,
            statuscode: 182980001, // Issued
            createdon: new Date().toISOString(),
            modifiedon: new Date().toISOString(),
            actum_redeemedon: null,
            'claimedBy.fullname': 'Nina Verstraeten',
            'distributorAccount.name': null,
            'reward.name': 'Premium Tool Set',
            'reward.pointamount': 500,
          },
        ];
      }

      if (!config.flows.getVouchers || config.flows.getVouchers === 'TODO: add endpoint') {
        throw new Error('Vouchers fetch flow URL is not configured.');
      }

      try {
        // Use Power Automate flow to fetch vouchers with contact names
        // (Direct OData queries can't expand contacts due to permissions)
        const response = await apiClient.flow<FlowArrayResponse<any>>(config.flows.getVouchers, {});

        // Flow returns { status: "200", data: "[...]" } where data is a JSON string
        if (response?.status === 'Success' || response?.status === '200') {
          const rawVouchers = parseFlowArrayData<any>(response, 'vouchers');
          
          // Transform the data: convert string numbers to actual numbers and map FetchXML aliases
          const vouchers: Voucher[] = rawVouchers.map((v: any) => ({
            ...v,
            statecode: typeof v.statecode === 'string' ? parseInt(v.statecode, 10) : v.statecode,
            statuscode: typeof v.statuscode === 'string' ? parseInt(v.statuscode, 10) : v.statuscode,
            'claimedBy.fullname': v['claimedBy.fullname'] || null,
            'claimedBy.email': v['claimedBy.claimedByEmail'] || null,
            'redeemedBy.fullname': v['redeemedBy.fullname'] || null,
            'redeemedBy.email': v['redeemedBy.redeemedByEmail'] || null,
            'redeemedBy.account': v['redeemedByAccount.accountName'] || null,
            'installerAccount.name': v['installerAccount.name'] || null,
            'distributorAccount.name': v['distributorAccount.name'] || null,
            'reward.name': v['reward.actum_name'] || null,
            'reward.pointamount': v['reward.actum_pointamount'] != null
              ? (typeof v['reward.actum_pointamount'] === 'string' ? parseInt(v['reward.actum_pointamount'], 10) : v['reward.actum_pointamount'])
              : null,
            actum_redeemedon: v.actum_redeemedon || null,
          }));
          
          return vouchers;
        } else if (response?.status === '500') {
          throw new Error(response.message || 'Failed to fetch vouchers');
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching vouchers:', error);
        throw error;
      }
    },

    /**
     * Get all vouchers redeemed by a specific distributor contact (distributors only)
     * @param contactId - Distributor Contact GUID
     * @returns Array of vouchers redeemed by this distributor across all installer accounts
     */
    async getRedeemedByDistributor(contactId: string): Promise<Voucher[]> {
      if (config.devMode) {
        // Dev mode: return mock redeemed vouchers
        return [
          {
            actum_voucherid: 'voucher-002',
            actum_name: 'Reward Voucher 202603201145',
            actum_vouchercode: 'AB12CD34EF',
            actum_expirationdate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            _actum_account_value: 'installer-account-001',
            _actum_contactid_value: 'installer-contact-002',
            _actum_loyaltytransaction_value: 'transaction-002',
            _actum_rewardclaimlineid_value: 'claimline-002',
            _actum_redeemedby_value: contactId,
            _actum_distributorid_value: 'distributor-account-001',
            statecode: 0,
            statuscode: 182980002, // Redeemed
            createdon: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            modifiedon: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            'claimedBy.fullname': 'Bram Van den Broeck',
            'claimedBy.email': 'bram.broeck@example.com',
            'redeemedBy.fullname': 'Current Distributor',
            'redeemedBy.email': 'distributor@example.com',
            'redeemedBy.account': 'My Distribution Company',
          },
          {
            actum_voucherid: 'voucher-005',
            actum_name: 'Reward Voucher 202604011200',
            actum_vouchercode: 'LMNOP78901',
            actum_expirationdate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
            _actum_account_value: 'installer-account-002',
            _actum_contactid_value: 'installer-contact-001',
            _actum_loyaltytransaction_value: 'transaction-005',
            _actum_rewardclaimlineid_value: 'claimline-005',
            _actum_redeemedby_value: contactId,
            _actum_distributorid_value: 'distributor-account-001',
            statecode: 0,
            statuscode: 182980002, // Redeemed
            createdon: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            modifiedon: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            'claimedBy.fullname': 'Lotte De Smet',
            'claimedBy.email': 'lotte.desmet@example.com',
            'redeemedBy.fullname': 'Current Distributor',
            'redeemedBy.email': 'distributor@example.com',
            'redeemedBy.account': 'My Distribution Company',
          },
        ];
      }

      if (!config.flows.getRedeemedVouchersByDistributor || config.flows.getRedeemedVouchersByDistributor === 'TODO: add endpoint') {
        throw new Error('Get redeemed vouchers by distributor flow URL is not configured.');
      }

      try {
        // Use Power Automate flow to fetch redeemed vouchers
        const response = await apiClient.flow<FlowArrayResponse<any>>(config.flows.getRedeemedVouchersByDistributor, {
          contactId: contactId,
        });

        // Flow returns { status: "200", data: "[...]" } where data is a JSON string
        if (response?.status === 'Success' || response?.status === '200') {
          const rawVouchers = parseFlowArrayData<any>(response, 'vouchers');
          
          // Transform the data: convert string numbers to actual numbers and empty strings to null
          const vouchers: Voucher[] = rawVouchers.map((v: any) => ({
            ...v,
            statecode: typeof v.statecode === 'string' ? parseInt(v.statecode, 10) : v.statecode,
            statuscode: typeof v.statuscode === 'string' ? parseInt(v.statuscode, 10) : v.statuscode,
            'claimedBy.fullname': v['claimedBy.fullname'] || null,
            'claimedBy.email': v['claimedBy.email'] || null,
            'redeemedBy.fullname': v['redeemedBy.fullname'] || null,
            'redeemedBy.email': v['redeemedBy.email'] || null,
            'redeemedBy.account': v['redeemedBy.account'] || null,
          }));
          
          return vouchers;
        } else if (response?.status === '500') {
          throw new Error(response.message || 'Failed to fetch redeemed vouchers');
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching redeemed vouchers:', error);
        throw error;
      }
    },

    /**
     * Validate a voucher code (distributor only)
     * @param voucherCode - The voucher code to validate
     * @param accountId - Distributor's account ID
     * @param contactId - Distributor's contact ID
     * @returns Validation result with voucher details if valid
     */
    async validateVoucher(
      voucherCode: string,
      accountId: string,
      contactId: string
    ): Promise<{
      valid: boolean;
      voucherId?: string;
      message?: string;
      voucher?: any;
    }> {
      if (config.devMode) {
        // Dev mode: simulate validation
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Check if code exists in mock data
        const mockVouchers = await this.getByAccount(accountId);
        const found = mockVouchers.find(v => v.actum_vouchercode === voucherCode);
        
        if (!found) {
          return {
            valid: false,
            message: 'Voucher code not found',
          };
        }
        
        if (found.statuscode === 182980002) {
          return {
            valid: false,
            message: 'This voucher has already been redeemed',
          };
        }
        
        if (found.statuscode === 182980003) {
          return {
            valid: false,
            message: 'This voucher has expired',
          };
        }
        
        return {
          valid: true,
          voucherId: found.actum_voucherid,
          voucher: found,
        };
      }

      if (!config.flows.validateVoucher) {
        throw new Error('Validate voucher flow URL is not configured.');
      }

      try {
        const response = await apiClient.flow<any>(config.flows.validateVoucher, {
          voucherCode,
          accountId,
          contactId,
        });

        if (response?.status === 'success' || response?.status === 'Success') {
          return {
            valid: true,
            // Handle both voucherId (camelCase) and voucherid (lowercase) from flow
            voucherId: response.voucherId || response.voucherid,
            voucher: response.voucher,
          };
        } else {
          return {
            valid: false,
            message: response?.message || 'Invalid voucher code',
          };
        }
      } catch (error) {
        console.error('Error validating voucher:', error);
        throw error;
      }
    },

    /**
     * Redeem a voucher (distributor only)
     * @param voucherId - The voucher ID from validation
     * @param accountId - Distributor's account ID
     * @param contactId - Distributor's contact ID
     * @returns Redemption result
     */
    async redeemVoucher(
      voucherId: string,
      accountId: string,
      contactId: string
    ): Promise<{
      success: boolean;
      message?: string;
    }> {
      if (config.devMode) {
        // Dev mode: simulate redemption
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        return {
          success: true,
          message: 'Voucher redeemed successfully',
        };
      }

      if (!config.flows.redeemVoucher) {
        throw new Error('Redeem voucher flow URL is not configured.');
      }

      try {
        const response = await apiClient.flow<any>(config.flows.redeemVoucher, {
          voucherId,
          accountId,
          contactId,
        });

        if (response?.status === 'success' || response?.status === 'Success') {
          return {
            success: true,
            message: 'Voucher redeemed successfully',
          };
        } else {
          return {
            success: false,
            message: response?.message || 'Failed to redeem voucher',
          };
        }
      } catch (error) {
        console.error('Error redeeming voucher:', error);
        throw error;
      }
    },
  },
};
