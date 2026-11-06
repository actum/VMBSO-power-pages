import { describe, expect, test, vi } from 'vitest';
import { TermsScope, type TermsAcceptance, type TermsText, type TermsVersion } from '../types/terms';
import { computeRequiredTerms, pickText, qualifiesForScope, resolveRequiredVersions } from './termsResolver';

const BE = 'be';
const FR = 'fr';
const INSTALLER = { actum_name: 'Installer', actum_uploadinvoicesallowed: true };
const ARCHITECT = { actum_name: 'Architect', actum_uploadinvoicesallowed: false };
const DISTRIBUTOR = { actum_name: 'Distributor' };
const UPLOAD_ON = { actum_uploadinvoicesallowed: true };

let seq = 0;
const version = (scope: number, country: string | null, v: number, createdon = '2026-01-01T00:00:00Z'): TermsVersion => ({
  actum_termsversionid: `v${++seq}`,
  actum_name: `${scope}-${country ?? 'default'}-v${v}`,
  actum_scope: scope as TermsVersion['actum_scope'],
  _actum_countryid_value: country,
  actum_version: v,
  createdon,
});
const acceptance = (v: TermsVersion, createdon = '2026-02-01T00:00:00Z'): TermsAcceptance => ({
  actum_termsacceptanceid: `a${++seq}`,
  _actum_termsversionid_value: v.actum_termsversionid,
  _actum_languageid_value: 'lang-fr',
  createdon,
  version: { actum_scope: v.actum_scope, _actum_countryid_value: v._actum_countryid_value },
});
const text = (lang: string, createdon = '2026-01-01T00:00:00Z'): TermsText => ({
  actum_termstextid: `t-${lang}-${createdon}`,
  _actum_termsversionid_value: 'v',
  _actum_languageid_value: lang,
  actum_body: `<p>${lang}</p>`,
  createdon,
});

describe('qualifiesForScope', () => {
  test('General always applies', () => {
    expect(qualifiesForScope(TermsScope.General, {})).toBe(true);
  });
  test('InvoiceUpload needs role AND country flags', () => {
    expect(qualifiesForScope(TermsScope.InvoiceUpload, { role: INSTALLER, country: UPLOAD_ON })).toBe(true);
    expect(qualifiesForScope(TermsScope.InvoiceUpload, { role: INSTALLER, country: { actum_uploadinvoicesallowed: false } })).toBe(false);
    expect(qualifiesForScope(TermsScope.InvoiceUpload, { role: ARCHITECT, country: UPLOAD_ON })).toBe(false);
  });
  test('Distributor follows the role name', () => {
    expect(qualifiesForScope(TermsScope.Distributor, { role: DISTRIBUTOR })).toBe(true);
    expect(qualifiesForScope(TermsScope.Distributor, { role: { actum_name: 'Architect' } })).toBe(false);
  });
});

describe('resolveRequiredVersions', () => {
  test('BE installer gets BE General + BE InvoiceUpload, highest version', () => {
    const g1 = version(TermsScope.General, BE, 1);
    const g2 = version(TermsScope.General, BE, 2);
    const inv = version(TermsScope.InvoiceUpload, BE, 1);
    const dist = version(TermsScope.Distributor, BE, 1);
    const result = resolveRequiredVersions([g1, g2, inv, dist], { countryId: BE, role: INSTALLER, country: UPLOAD_ON });
    expect(result.map((v) => v.actum_termsversionid).sort()).toEqual([g2.actum_termsversionid, inv.actum_termsversionid].sort());
  });

  test('prefers country rows over default rows for the same scope', () => {
    const be1 = version(TermsScope.General, BE, 1);
    const def5 = version(TermsScope.General, null, 5);
    expect(resolveRequiredVersions([be1, def5], { countryId: BE })).toEqual([be1]);
  });

  test('falls back to default rows when country has none', () => {
    const def = version(TermsScope.General, null, 1);
    const be = version(TermsScope.General, BE, 1);
    expect(resolveRequiredVersions([def, be], { countryId: 'nl' })).toEqual([def]);
  });

  test('returns empty when no candidates (and warns)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveRequiredVersions([], { countryId: BE })).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('same version number -> newest createdon wins', () => {
    const older = version(TermsScope.General, BE, 3, '2026-01-01T00:00:00Z');
    const newer = version(TermsScope.General, BE, 3, '2026-03-01T00:00:00Z');
    expect(resolveRequiredVersions([older, newer], { countryId: BE })).toEqual([newer]);
  });

  test('architect in BE gets General only', () => {
    const g = version(TermsScope.General, BE, 1);
    const inv = version(TermsScope.InvoiceUpload, BE, 1);
    const dist = version(TermsScope.Distributor, BE, 1);
    expect(resolveRequiredVersions([g, inv, dist], { countryId: BE, role: ARCHITECT, country: UPLOAD_ON })).toEqual([g]);
  });

  test('no country on the user -> default set only', () => {
    const def = version(TermsScope.General, null, 1);
    const be = version(TermsScope.General, BE, 1);
    expect(resolveRequiredVersions([def, be], {})).toEqual([def]);
  });
});

describe('computeRequiredTerms', () => {
  test('accepted version -> accepted:true with acceptedOn = acceptance.createdon', () => {
    const g = version(TermsScope.General, FR, 1);
    const a = acceptance(g, '2026-05-05T10:00:00Z');
    expect(computeRequiredTerms([g], [a])).toEqual([{ version: g, accepted: true, acceptedOn: '2026-05-05T10:00:00Z' }]);
  });

  test('older version of same scope+country accepted -> kind "updated"', () => {
    const g1 = version(TermsScope.General, FR, 1);
    const g2 = version(TermsScope.General, FR, 2);
    const [term] = computeRequiredTerms([g2], [acceptance(g1)]);
    expect(term).toMatchObject({ accepted: false, kind: 'updated' });
  });

  test('same scope but other country accepted -> kind "new"', () => {
    const be = version(TermsScope.General, BE, 1);
    const fr = version(TermsScope.General, FR, 1);
    expect(computeRequiredTerms([fr], [acceptance(be)])[0]).toMatchObject({ accepted: false, kind: 'new' });
  });

  test('scope never accepted -> kind "new"', () => {
    const inv = version(TermsScope.InvoiceUpload, BE, 1);
    expect(computeRequiredTerms([inv], [])[0]).toMatchObject({ accepted: false, kind: 'new' });
  });

  test('acceptance in another language still counts', () => {
    const g = version(TermsScope.General, BE, 1);
    const a = { ...acceptance(g), _actum_languageid_value: 'lang-nl' };
    expect(computeRequiredTerms([g], [a])[0].accepted).toBe(true);
  });
});

describe('pickText', () => {
  const EN = 'lang-en';
  test('returns UI language text when present, isUiLanguage true', () => {
    const fr = text('lang-fr');
    expect(pickText([text(EN), fr], 'lang-fr', EN)).toEqual({ text: fr, isUiLanguage: true });
  });
  test('single text -> that text, isUiLanguage false', () => {
    const fr = text('lang-fr');
    expect(pickText([fr], 'lang-nl', EN)).toEqual({ text: fr, isUiLanguage: false });
  });
  test('no UI match, several texts -> English', () => {
    const en = text(EN);
    expect(pickText([text('lang-fr'), en], 'lang-nl', EN)).toEqual({ text: en, isUiLanguage: false });
  });
  test('no UI match, no English -> oldest createdon', () => {
    const oldest = text('lang-fr', '2025-01-01T00:00:00Z');
    expect(pickText([text('lang-de', '2026-01-01T00:00:00Z'), oldest], 'lang-nl', EN)).toEqual({ text: oldest, isUiLanguage: false });
  });
  test('no texts -> undefined', () => {
    expect(pickText([], 'lang-nl', EN)).toBeUndefined();
  });
});
