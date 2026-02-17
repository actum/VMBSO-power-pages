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
   * Check if user has an active session and get current user
   * @returns Current user or null if not authenticated
   */
  checkSession: async (): Promise<Contact | null> => {
    if (IS_DEV_MODE) {
      const user = localStorage.getItem('dev_user');
      return user ? JSON.parse(user) : null;
    }
    
    try {
      // Use the Web API to get current contact
      const response = await fetch('/_api/contacts?$filter=contactid eq @current_user&$select=contactid,firstname,lastname,emailaddress1,fullname,createdon', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return null; // Not authenticated
        }
        throw new Error('Session check failed');
      }

      const data = await response.json();
      
      // Return the current user's contact
      if (data.value && data.value.length > 0) {
        return data.value[0] as Contact;
      }

      return null;
    } catch (error) {
      console.error('Session check error:', error);
      return null;
    }
  },
};
