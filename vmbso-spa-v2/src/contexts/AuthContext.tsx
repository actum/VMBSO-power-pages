import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type Contact } from '../types/contact';
import type { RequiredTerm } from '../types/terms';
import { authService } from '../services/authService';
import { devMockRequiredTerms, loadRequiredTerms } from '../services/termsStatus';
import { config } from '../config/powerPages.config';

const APPROVAL_STATUS_REJECTED = 182980002;

interface AuthContextType {
  currentUser: Contact | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isRejected: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** True until the terms status of the current user (complete profile) is known. */
  termsLoading: boolean;
  /** Every T&C document that applies to the user, accepted or not (VMPP-323). */
  requiredTerms: RequiredTerm[];
  /** The applicable documents the user has not accepted yet; the app is gated while non-empty. */
  missingTerms: RequiredTerm[];
  /** Reload the terms status, e.g. after accepting. */
  refreshTerms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Required personal profile fields — the contact must be linked to an Account
// (_parentcustomerid_value) for the company portion to be considered complete.
const requiredPersonalFields: Array<keyof Contact> = [
  "telephone1",
];

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = currentUser !== null;
  const isRejected = currentUser?.actum_approvalstatus === APPROVAL_STATUS_REJECTED;

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
    if (import.meta.env.DEV) {
      console.log('[AUTH CONTEXT DEBUG] Profile complete check:', complete, '| personal:', personalComplete, '| company (account linked):', companyComplete);
    }
    return complete;
  }, [currentUser]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AUTH CONTEXT DEBUG] Initial session check on mount');
    }
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('[AUTH CONTEXT DEBUG] checkSession started');
      }
      setLoading(true);
      const user = await authService.checkSession();

      if (import.meta.env.DEV) {
        console.log('[AUTH CONTEXT DEBUG] checkSession result:', user ? `User: ${user.contactid}` : 'No user');
      }
      setCurrentUser(user);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AUTH CONTEXT DEBUG] Session check failed:', error);
      }
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }

  };

  // Logout: clears client state then POSTs to Power Pages to invalidate the session cookie
  const logout = async () => {
    setCurrentUser(null);
    await authService.logout();
  };

  const refreshUser = async () => {
    const user = await authService.checkSession();
    setCurrentUser(user);
  };

  // ── Terms & Conditions status (VMPP-323) ─────────────────────────────
  // Only users with a complete profile are gated; new users accept on the Update Profile page.
  // `termsKey` identifies the user + profile state the terms belong to, so termsLoading stays
  // true (and the gate waits) until terms for the *current* state are loaded.
  const [requiredTerms, setRequiredTerms] = useState<RequiredTerm[]>([]);
  const [termsKey, setTermsKey] = useState<string | null>(null);
  const currentTermsKey = currentUser && isProfileComplete ? `${currentUser.contactid}` : null;

  const refreshTerms = useCallback(async () => {
    if (!currentUser || !currentTermsKey) {
      setRequiredTerms([]);
      setTermsKey(null);
      return;
    }
    if (config.devMode) {
      setRequiredTerms(devMockRequiredTerms());
      setTermsKey(currentTermsKey);
      return;
    }
    try {
      setRequiredTerms(await loadRequiredTerms(currentUser));
    } catch (error) {
      // Fail open: a read error must not lock users out of the portal.
      console.error('[TERMS] Could not load terms status:', error);
      setRequiredTerms([]);
    } finally {
      setTermsKey(currentTermsKey);
    }
  }, [currentUser, currentTermsKey]);

  useEffect(() => {
    refreshTerms();
  }, [refreshTerms]);

  const termsLoading = loading || (currentTermsKey !== null && termsKey !== currentTermsKey);
  const missingTerms = React.useMemo(() => requiredTerms.filter((t) => !t.accepted), [requiredTerms]);

  const value: AuthContextType = {
    currentUser,
    isAuthenticated,
    isProfileComplete,
    isRejected,
    loading,
    logout,
    refreshUser,
    termsLoading,
    requiredTerms,
    missingTerms,
    refreshTerms,
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
