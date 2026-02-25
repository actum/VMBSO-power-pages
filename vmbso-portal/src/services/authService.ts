import { Contact } from '../types/contact';

interface RegisterData {
  firstname: string;
  lastname: string;
  emailaddress1: string;
  password: string;
  confirmPassword: string;
  // TODO: Add custom fields when Dataverse schema is confirmed
  // actum_country?: string;
  // actum_role?: string;
}

interface LoginData {
  username: string;
  password: string;
}

const IS_DEV_MODE = process.env.REACT_APP_DEV_MODE === 'true';
const PORTAL_URL = process.env.REACT_APP_PORTAL_URL || window.location.origin;

// Mock user for development
const MOCK_USER = {
  contactid: 'dev-user-123',
  firstname: 'John',
  lastname: 'Doe',
  emailaddress1: 'john.doe@example.com',
  fullname: 'John Doe',
  createdon: new Date().toISOString(),
};

export const authService = {
  /**
   * Register a new user - redirects to Power Pages registration page
   * @param data - Registration form data
   */
  register: async (data: RegisterData): Promise<void> => {
    if (IS_DEV_MODE) {
      console.log('DEV MODE: Mock registration', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }

    // Store registration data to pre-fill the form
    sessionStorage.setItem('registration_data', JSON.stringify(data));

    // Redirect to Power Pages registration page
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/register?returnUrl=${returnUrl}`;
  },

  /**
   * Login user - redirects to Power Pages sign-in page
   * @param username - User email
   * @param password - User password
   */
  login: async (username: string, password: string): Promise<void> => {
    if (IS_DEV_MODE) {
      console.log('DEV MODE: Mock login', { username });
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('dev_user', JSON.stringify(MOCK_USER));
      return;
    }
    
    // Store credentials to pre-fill the form
    sessionStorage.setItem('login_username', username);
    
    // Redirect to Power Pages sign-in page
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/signin?returnUrl=${returnUrl}`;
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    if (IS_DEV_MODE) {
      console.log('DEV MODE: Mock logout');
      localStorage.removeItem('dev_user');
      return;
    }
    
    // Redirect to Power Pages sign-out endpoint
    window.location.href = '/account/login/logout';
  },

  /**
   * Check if user has an active session and get current user.
   * Power Pages Web API automatically scopes /_api/contacts to the
   * authenticated user's own Contact record — no filter needed.
   * @returns Current user Contact or null if not authenticated
   */
  checkSession: async (): Promise<Contact | null> => {
    if (IS_DEV_MODE) {
      const user = localStorage.getItem('dev_user');
      return user ? JSON.parse(user) : null;
    }

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

      const response = await fetch(`/_api/contacts?$select=${select}`, {
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
    if (IS_DEV_MODE) {
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

    const response = await fetch(`/_api/contacts(${contactid})`, {
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
