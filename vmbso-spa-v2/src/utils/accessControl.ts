import type { Contact } from '../types/contact';
import { config } from '../config/powerPages.config';

// Approval status codes from Dataverse
const APPROVAL_STATUS_APPROVED = 182980001;

type RoleFlags = { actum_name?: string; actum_uploadinvoicesallowed?: boolean };
type CountryFlags = { actum_uploadinvoicesallowed?: boolean };

/**
 * Feature rule only (no approval or account checks): invoice upload / rewards is available when
 * both the role and the country allow it. Also used for Terms & Conditions, which are accepted
 * before approval.
 */
export const hasInvoiceUploadFeature = (role?: RoleFlags, country?: CountryFlags): boolean =>
  role?.actum_uploadinvoicesallowed === true && country?.actum_uploadinvoicesallowed === true;

/** Feature rule only: the role is Distributor (case-insensitive). */
export const isDistributorRole = (role?: RoleFlags): boolean => role?.actum_name?.toLowerCase() === 'distributor';

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

  // Role and Country must both allow invoice uploads
  return hasInvoiceUploadFeature(user.parentcustomerid.actum_Role, user.parentcustomerid.actum_Country);
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

  // Distributors always have access to vouchers
  if (isDistributorRole(user.parentcustomerid.actum_Role)) {
    return true;
  }

  // Installers need both role and country permissions
  return hasInvoiceUploadFeature(user.parentcustomerid.actum_Role, user.parentcustomerid.actum_Country);
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

  // Role name must be "Distributor" (case-insensitive)
  return isDistributorRole(user.parentcustomerid?.actum_Role);
};
