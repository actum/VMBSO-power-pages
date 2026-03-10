import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Contact } from '../types/contact';
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

// Required personal profile fields — the contact must be linked to an Account
// (_parentcustomerid_value) for the company portion to be considered complete.
const requiredPersonalFields: Array<keyof Contact> = [
  "actum_language",
  "actum_phone",
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
    // Personal fields must be filled
    const personalComplete = requiredPersonalFields.every(key => {
      const value = currentUser[key];
      return value && value.toString().trim().length > 0;
    });
    // Company is complete when the contact is linked to an Account
    const companyComplete = !!currentUser._parentcustomerid_value;
    const complete = personalComplete && companyComplete;
    console.log('[AUTH CONTEXT DEBUG] Profile complete check:', complete, '| personal:', personalComplete, '| company (account linked):', companyComplete);
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
