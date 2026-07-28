import type { Contact } from '../types/contact';
import { config } from '../config/powerPages.config';

// Approval status codes from Dataverse
const APPROVAL_STATUS_APPROVED = 182980001;

/**
 * Check if the current user can access the Invoices page.
 * 
 * Requirements:
 * - User must be approved (actum_approvalstatus = 182980001)
 * - User must have an Account linked (_parentcustomerid_value)
 * - Account's Role must have actum_uploadinvoicesallowed = true
 * - Account's Country must have actum_uploadinvoicesallowed = true
 * 
 * In DEV mode, always returns true for testing.
 * 
 * @param user - The current authenticated user (Contact)
 * @returns true if user can access Invoices, false otherwise
 */
export const canAccessInvoices = (user: Contact | null): boolean => {
  // In dev mode, allow access for testing
  if (config.devMode) {
    return true;
  }

  // Must be authenticated
  if (!user) {
    return false;
  }

  // Must be approved
  if (user.actum_approvalstatus !== APPROVAL_STATUS_APPROVED) {
    return false;
  }

  // Must have an Account linked
  if (!user._parentcustomerid_value) {
    return false;
  }

  // Must have expanded Account data with Role and Country
  if (!user.parentcustomerid) {
    return false;
  }

  // Check Role allows invoice uploads
  const roleAllowsInvoices = user.parentcustomerid.actum_Role?.actum_uploadinvoicesallowed === true;
  
  // Check Country allows invoice uploads
  const countryAllowsInvoices = user.parentcustomerid.actum_Country?.actum_uploadinvoicesallowed === true;

  // All conditions must be true
  return roleAllowsInvoices && countryAllowsInvoices;
};

/**
 * Check if the current user can access the Rewards page.
 * 
 * Uses the EXACT same permission model as Invoices:
 * - User must be approved (actum_approvalstatus = 182980001)
 * - User must have an Account linked (_parentcustomerid_value)
 * - Account's Role must have actum_uploadinvoicesallowed = true
 * - Account's Country must have actum_uploadinvoicesallowed = true
 * 
 * In DEV mode, always returns true for testing.
 * 
 * @param user - The current authenticated user (Contact)
 * @returns true if user can access Rewards, false otherwise
 */
export const canAccessRewards = (user: Contact | null): boolean => {
  // Rewards use the same permission as Invoices
  return canAccessInvoices(user);
};

/**
 * Check if the current user can access the Vouchers page.
 * 
 * Vouchers are accessible to:
 * - Installers (who have invoice upload permissions)
 * - Distributors (who need to redeem vouchers for installers)
 * 
 * Requirements:
 * - User must be approved (actum_approvalstatus = 182980001)
 * - User must have an Account linked (_parentcustomerid_value)
 * - User must be either:
 *   - An installer with invoice permissions (Role & Country have actum_uploadinvoicesallowed = true)
 *   - A distributor (Role name = "Distributor")
 * 
 * In DEV mode, always returns true for testing.
 * 
 * @param user - The current authenticated user (Contact)
 * @returns true if user can access Vouchers, false otherwise
 */
export const canAccessVouchers = (user: Contact | null): boolean => {
  // In dev mode, allow access for testing
  if (config.devMode) {
    return true;
  }

  // Must be authenticated
  if (!user) {
    return false;
  }

  // Must be approved
  if (user.actum_approvalstatus !== APPROVAL_STATUS_APPROVED) {
    return false;
  }

  // Must have an Account linked
  if (!user._parentcustomerid_value) {
    return false;
  }

  // Must have expanded Account data with Role
  if (!user.parentcustomerid?.actum_Role) {
    return false;
  }

  // Check if user is a distributor
  const roleName = user.parentcustomerid.actum_Role.actum_name?.toLowerCase();
  if (roleName === 'distributor') {
    return true; // Distributors always have access to vouchers
  }

  // For non-distributors (installers, etc.), check if they have invoice permissions
  // Check Role allows invoice uploads
  const roleAllowsInvoices = user.parentcustomerid.actum_Role.actum_uploadinvoicesallowed === true;
  
  // Check Country allows invoice uploads
  const countryAllowsInvoices = user.parentcustomerid.actum_Country?.actum_uploadinvoicesallowed === true;

  // Installers need both role and country permissions
  return roleAllowsInvoices && countryAllowsInvoices;
};

/**
 * Check if the current user is a distributor.
 * 
 * Distributors can redeem vouchers that installers have generated.
 * 
 * In DEV mode, always returns true for testing.
 * 
 * @param user - The current authenticated user (Contact)
 * @returns true if user is a distributor, false otherwise
 */
export const isDistributor = (user: Contact | null): boolean => {
  // In dev mode, allow toggling via REACT_APP_DEV_ROLE env var:
  //   REACT_APP_DEV_ROLE=installer → installer view
  //   REACT_APP_DEV_ROLE=distributor (default) → distributor view
  if (config.devMode) {
    const devRole = import.meta.env.REACT_APP_DEV_ROLE ?? 'distributor';
    return devRole === 'distributor';
  }

  // Must be authenticated
  if (!user) {
    return false;
  }

  // Must have Account with Role
  if (!user.parentcustomerid?.actum_Role) {
    return false;
  }

  // Check if role name is "Distributor" (case-insensitive)
  const roleName = user.parentcustomerid.actum_Role.actum_name?.toLowerCase();
  return roleName === 'distributor';
};
