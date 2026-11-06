import { describe, expect, test, vi } from 'vitest';
import type { Contact } from '../types/contact';
import { TermsScope, type TermsAcceptance, type TermsVersion } from '../types/terms';

const getPublishedCandidates = vi.fn();
const getMyAcceptances = vi.fn();
vi.mock('./dataverseService', () => ({
  dataverseService: { terms: { getPublishedCandidates, getMyAcceptances } },
}));

const { featureContextFromUser, loadRequiredTerms } = await import('./termsStatus');

const user: Contact = {
  contactid: 'c1',
  emailaddress1: 'x@example.com',
  _parentcustomerid_value: 'acc1',
  parentcustomerid: {
    accountid: 'acc1',
    name: 'Acme',
    actum_Role: { actum_roleid: 'r1', actum_name: 'Installer', actum_uploadinvoicesallowed: true },
    actum_Country: { actum_countryid: 'be', actum_name: 'Belgium', actum_uploadinvoicesallowed: true },
  },
};
const v = (id: string, scope: number, country: string | null): TermsVersion => ({
  actum_termsversionid: id,
  actum_name: id,
  actum_scope: scope as TermsVersion['actum_scope'],
  _actum_countryid_value: country,
  actum_version: 1,
  createdon: '2026-01-01T00:00:00Z',
});

describe('featureContextFromUser', () => {
  test('takes country id and flags from the account role and country', () => {
    expect(featureContextFromUser(user)).toEqual({
      countryId: 'be',
      role: user.parentcustomerid!.actum_Role,
      country: user.parentcustomerid!.actum_Country,
    });
  });
  test('user without account -> empty context (default set, General only)', () => {
    expect(featureContextFromUser({ contactid: 'c', emailaddress1: 'e' })).toEqual({
      countryId: undefined,
      role: undefined,
      country: undefined,
    });
  });
});

describe('loadRequiredTerms', () => {
  test('queries by the user country and marks accepted vs missing', async () => {
    const general = v('be-general', TermsScope.General, 'be');
    const upload = v('be-upload', TermsScope.InvoiceUpload, 'be');
    const accepted: TermsAcceptance = {
      actum_termsacceptanceid: 'a1',
      _actum_termsversionid_value: 'be-general',
      _actum_languageid_value: 'fr',
      createdon: '2026-02-02T00:00:00Z',
      version: { actum_scope: TermsScope.General, _actum_countryid_value: 'be' },
    };
    getPublishedCandidates.mockResolvedValue([general, upload]);
    getMyAcceptances.mockResolvedValue([accepted]);

    const terms = await loadRequiredTerms(user);

    expect(getPublishedCandidates).toHaveBeenCalledWith('be');
    expect(terms).toEqual([
      { version: general, accepted: true, acceptedOn: '2026-02-02T00:00:00Z' },
      { version: upload, accepted: false, kind: 'new' },
    ]);
  });
});
