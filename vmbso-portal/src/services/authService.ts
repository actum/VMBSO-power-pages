import { Contact } from '../types/contact';
import { config } from '../config/powerPages.config';

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
  createdon: new Date().toISOString(),
  actum_language: 'fr',
  actum_companyname: 'Actum Digital',
  actum_vat: 'FR12345678901',
  actum_primarycountry: 'France',
  actum_companyphone: '+33 1 00 00 00 00',
  actum_phone: '+33 6 00 00 00 00',
  actum_address: '1 rue de la Paix, 75001 Paris',
  actum_role: 'Distributor',
  actum_brand: ['VMZINC'],
};

export const authService = {
  /**
   * Logout current user.
   * Federated logout clears both the Power Pages session and the Entra External ID session.
   * Page navigates away — no return value needed.
   */
  logout: (): void => {
    // if (config.devMode) {
    //   console.log('DEV MODE: Mock logout');
    //   localStorage.removeItem('dev_user');
    //   window.location.href = config.auth.loginPageUrl;
    //   return;
    // }

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
    // if (config.devMode) {
    //   // Read updated profile from localStorage (set by updateProfile in dev mode),
    //   // or fall back to the seeded mock user.
    //   const stored = localStorage.getItem('dev_user');
    //   if (stored) return JSON.parse(stored) as Contact;
    //   localStorage.setItem('dev_user', JSON.stringify(DEV_MOCK_USER));
    //   return DEV_MOCK_USER;
    // }

    try {
      const select = [
        'contactid',
        'firstname',
        'lastname',
        'emailaddress1',
        'fullname',
        'createdon',
        'actum_language',
        'actum_phone',
        'actum_companyname',
        'actum_vat',
        'actum_primarycountry',
        'actum_companyphone',
        'actum_address',
        'actum_role',
        'actum_brand',
      ].join(',');

      const response = await fetch(`${config.api.contacts}?$select=${select}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
        credentials: 'include',
      });

      // 401/403 means no active session — not an error, just unauthenticated
      if (response.status === 401 || response.status === 403) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Session check failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.value && data.value.length > 0) {
        return data.value[0] as Contact;
      }

      // Authenticated but no Contact found (shouldn't happen in normal flow)
      console.warn('Session active but no Contact record found');
      return null;
    } catch (error) {
      console.error('Session check error:', error);
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

    const response = await fetch(config.api.contactById(contactid), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'If-Match': '*', // Required by Dataverse — prevents accidental create
      },
      credentials: 'include',
      body: JSON.stringify(updateFields),
    });

    // Dataverse PATCH returns 204 No Content on success
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Profile update failed (${response.status}): ${errorText}`);
    }

    // Re-fetch session to return the updated Contact with all fields
    const updatedUser = await authService.checkSession();
    if (!updatedUser) {
      throw new Error('Unable to fetch updated user after profile save');
    }
    return updatedUser;
  },
};
