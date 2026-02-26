import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Contact } from '../types/contact';
import { authService } from '../services/authService';

interface RegisterData {
  firstname: string;
  lastname: string;
  emailaddress1: string;
  password: string;
  confirmPassword: string;
  country?: string;
  role?: string;
}

interface AuthContextType {
  currentUser: Contact | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// required fields selectors
const requiredFields: Array<keyof Contact> = [
  "actum_language",
  "actum_companyname",
  "actum_vat",
  "actum_primarycountry",
  "actum_companyphone",
  "actum_phone",
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
    return requiredFields.every(key => {
      const value = currentUser[key];
      return value && value.toString().trim().length > 0;
    });
  }, [currentUser]);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      const user = await authService.checkSession();

      setCurrentUser(user);
    } catch (error) {
      console.error('Session check failed:', error);
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

  const register = async (data: RegisterData) => {
    await authService.register(data);
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated,
    isProfileComplete,
    loading,
    logout,
    refreshUser,
    register,
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
