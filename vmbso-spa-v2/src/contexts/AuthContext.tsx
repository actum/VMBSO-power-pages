import React, { createContext, useContext, useState, useEffect } from 'react';
import { type Contact } from '../types/contact';
import { authService } from '../services/authService';

interface AuthContextType {
  currentUser: Contact | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Required profile fields - matching UpdateProfile.tsx form requirements
// NOTE: These fields don't exist in Dataverse yet and need to be added to Contact table
const requiredFields: Array<keyof Contact> = [
  "actum_language",
  "actum_phone",
  "actum_companyname",
  "actum_vat",
  "actum_primarycountry",
  "actum_companyphone",
  "actum_address",
  "actum_role",
  "actum_brand",
];

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = currentUser !== null;

  const isProfileComplete = React.useMemo(() => {
    if (!currentUser) return false;
    const complete = requiredFields.every(key => {
      const value = currentUser[key];
      return value && value.toString().trim().length > 0;
    });
    console.log('[AUTH CONTEXT DEBUG] Profile complete check:', complete, 'Required fields:', requiredFields);
    return complete;
  }, [currentUser]);

  useEffect(() => {
    console.log('[AUTH CONTEXT DEBUG] Initial session check on mount');
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      console.log('[AUTH CONTEXT DEBUG] checkSession started');
      setLoading(true);
      const user = await authService.checkSession();

      console.log('[AUTH CONTEXT DEBUG] checkSession result:', user ? `User: ${user.contactid}` : 'No user');
      setCurrentUser(user);
    } catch (error) {
      console.error('[AUTH CONTEXT DEBUG] Session check failed:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }

  };

  // Logout: clears client state then redirects — page navigates away so no async needed
  const logout = () => {
    setCurrentUser(null);
    authService.logout();
  };

  const refreshUser = async () => {
    const user = await authService.checkSession();
    setCurrentUser(user);
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated,
    isProfileComplete,
    loading,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
