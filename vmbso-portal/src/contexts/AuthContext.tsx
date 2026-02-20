import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contact } from '../types/contact';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';

interface AuthContextType {
  currentUser: Contact | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
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
  const navigate = useNavigate();

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

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      await authService.login(username, password);

      const user = await authService.checkSession();

      setCurrentUser(user);

      toast.success('Login successful!');

      navigate('/documents');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    } finally {
      // Clear user even if logout fails
      setCurrentUser(null);
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    try {
      setLoading(true);
      await authService.register(data);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
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
    login,
    logout,
    register,
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
