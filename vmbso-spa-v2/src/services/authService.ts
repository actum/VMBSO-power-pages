import { type Contact } from '../types/contact';
import { config } from '../config/powerPages.config';
import { dataverseService } from './dataverseService';

/**
 * Mock user used in local development (REACT_APP_DEV_MODE=true).
 * All required profile fields are populated so the app lands on /documents
 * instead of /update-profile.
 */
const DEV_MOCK_USER: Contact = {
  contactid: 'dev-user-123',
  firstname: 'John',
  lastname: 'Doe',
  emailaddress1: 'john.doe@example.com',
  fullname: 'John Doe',
  mobilephone: '+33 6 00 00 00 00',
  telephone1: '+33 1 00 00 00 00',
  jobtitle: 'General Manager',
  createdon: new Date().toISOString(),
  modifiedon: new Date().toISOString(),
  // Required custom fields
  actum_approvalstatus: 182980000,  // Pending
  _actum_languageid_value: 'mock-language-id',
  actum_languageid: {
    actum_languageid: 'mock-language-id',
    actum_name: 'French'
  },
  _parentcustomerid_value: 'mock-account-id',
  parentcustomerid: {
    accountid: 'mock-account-id',
    name: 'Actum Digital'
  },
  // UpdateProfile form fields
  actum_language: 'fr-FR',
  actum_phone: '+33 6 00 00 00 00',
  actum_companyname: 'Actum Digital',
  actum_vat: 'FR12345678901',
  actum_primarycountry: 'France',
  actum_companyphone: '+33 1 00 00 00 00',
  actum_address: '1 rue de la Paix, 75001 Paris',
  actum_role: 'distributor',
  actum_brand: ['vmzinc'],
  actum_companyemail: 'contact@actumdigital.com',
  adx_identity_username: 'dev_user',
  adx_identity_emailaddress1confirmed: true,
};

export const authService = {
  /**
   * Logout current user.
   * Federated logout clears both the Power Pages session and the Entra External ID session.
   * Page navigates away — no return value needed.
   */
  logout: (): void => {
    if (config.devMode) {
      console.log('DEV MODE: Mock logout');
      localStorage.removeItem('dev_user');
      window.location.href = config.auth.loginPageUrl;
      return;
    }

    // Federated logout: clears both Power Pages session and Entra External ID session
    window.location.href = config.auth.logoutUrl;
  },

  /**
   * Check if user has an active session and get current user.
   * Power Pages Web API automatically scopes /_api/contacts to the
   * authenticated user's own Contact record — no filter needed.
   * @returns Current user Contact or null if not authenticated
   */
  checkSession: async (): Promise<Contact | null> => {
    console.log('[AUTH DEBUG] checkSession called, devMode:', config.devMode);
    
    if (config.devMode) {
      console.log('[AUTH DEBUG] DEV MODE active - using mock user');
      // Read updated profile from localStorage (set by updateProfile in dev mode),
      // or fall back to the seeded mock user.
      const stored = localStorage.getItem('dev_user');
      if (stored) {
        console.log('[AUTH DEBUG] Found dev_user in localStorage');
        return JSON.parse(stored) as Contact;
      }
      console.log('[AUTH DEBUG] Setting new dev_user in localStorage');
      localStorage.setItem('dev_user', JSON.stringify(DEV_MOCK_USER));
      return DEV_MOCK_USER;
    }

    // Production mode: check Power Pages global context first
    // This is populated immediately after login callback (before Web API is ready)
    const portalUser = (window as any)?.Microsoft?.Dynamic365?.Portal?.User;
    const userName = portalUser?.userName;
    console.log('[AUTH DEBUG] Power Pages context check - userName:', userName || 'Not found');
    
    if (!userName) {
      console.log('[AUTH DEBUG] Not authenticated - no userName in Power Pages context');
      return null;
    }

    console.log('[AUTH DEBUG] Authenticated - fetching contact details from Web API');
    try {
      const contact = await dataverseService.contacts.getCurrent();
      console.log('[AUTH DEBUG] Dataverse returned contact:', contact?.contactid, contact?.emailaddress1);
      return contact;
    } catch (error) {
      console.error('[AUTH DEBUG] Session check error:', error);
      return null;
    }
  },

  /**
   * Update profile fields on the contact record via Dataverse Web API.
   * Uses PATCH /_api/contacts({id}) — standard OData update.
   * Returns the refreshed Contact object after a successful save.
   */
  updateProfile: async (fields: Partial<Contact>): Promise<Contact> => {
    if (config.devMode) {
      console.log('DEV MODE: Mock profile update', fields);
      const userStr = localStorage.getItem('dev_user');
      const user = userStr ? JSON.parse(userStr) : {};
      const updated = { ...user, ...fields };
      localStorage.setItem('dev_user', JSON.stringify(updated));
      return updated as Contact;
    }

    const { contactid, ...updateFields } = fields;
    if (!contactid) {
      throw new Error('Missing contact ID for profile update');
    }

    return dataverseService.contacts.update(contactid, updateFields);
  },
};
