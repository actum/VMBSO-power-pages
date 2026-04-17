import { Contact } from '../types/contact';
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
