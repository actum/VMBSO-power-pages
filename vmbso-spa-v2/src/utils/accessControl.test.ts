import { describe, expect, test, vi } from 'vitest';
import type { Contact } from '../types/contact';

vi.mock('../config/powerPages.config', () => ({ config: { devMode: false } }));

const { canAccessInvoices, canAccessVouchers, hasInvoiceUploadFeature, isDistributor, isDistributorRole } = await import('./accessControl');

const APPROVED = 182980001;
const PENDING = 182980000;
const user = (approval: number, roleName: string, roleUpload: boolean, countryUpload: boolean): Contact => ({
  contactid: 'c1',
  emailaddress1: 'x@example.com',
  actum_approvalstatus: approval,
  _parentcustomerid_value: 'acc1',
  parentcustomerid: {
    accountid: 'acc1',
    name: 'Acme',
    actum_Role: { actum_roleid: 'r1', actum_name: roleName, actum_uploadinvoicesallowed: roleUpload },
    actum_Country: { actum_countryid: 'be', actum_name: 'Belgium', actum_uploadinvoicesallowed: countryUpload },
  },
});

describe('existing access rules are unchanged', () => {
  test('approved installer with upload flags', () => {
    const u = user(APPROVED, 'Installer', true, true);
    expect(canAccessInvoices(u)).toBe(true);
    expect(canAccessVouchers(u)).toBe(true);
    expect(isDistributor(u)).toBe(false);
  });
  test('pending installer', () => {
    const u = user(PENDING, 'Installer', true, true);
    expect(canAccessInvoices(u)).toBe(false);
    expect(canAccessVouchers(u)).toBe(false);
  });
  test('approved installer, country without upload', () => {
    expect(canAccessInvoices(user(APPROVED, 'Installer', true, false))).toBe(false);
  });
  test('approved distributor', () => {
    const u = user(APPROVED, 'Distributor', false, false);
    expect(canAccessInvoices(u)).toBe(false);
    expect(canAccessVouchers(u)).toBe(true);
    expect(isDistributor(u)).toBe(true);
  });
  test('no user', () => {
    expect(canAccessInvoices(null)).toBe(false);
    expect(isDistributor(null)).toBe(false);
  });
});

describe('feature helpers (no approval check: T&C are accepted before approval)', () => {
  test('hasInvoiceUploadFeature needs both flags', () => {
    expect(hasInvoiceUploadFeature({ actum_uploadinvoicesallowed: true }, { actum_uploadinvoicesallowed: true })).toBe(true);
    expect(hasInvoiceUploadFeature({ actum_uploadinvoicesallowed: true }, undefined)).toBe(false);
    expect(hasInvoiceUploadFeature(undefined, { actum_uploadinvoicesallowed: true })).toBe(false);
  });
  test('isDistributorRole is case-insensitive', () => {
    expect(isDistributorRole({ actum_name: 'DISTRIBUTOR' })).toBe(true);
    expect(isDistributorRole({ actum_name: 'Installer' })).toBe(false);
    expect(isDistributorRole(undefined)).toBe(false);
  });
});
