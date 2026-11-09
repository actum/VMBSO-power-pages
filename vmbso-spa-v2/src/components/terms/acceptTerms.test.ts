import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TermsScope, type RequiredTerm, type TermsText } from '../../types/terms';

const createAcceptance = vi.fn();
vi.mock('../../services/dataverseService', () => ({ dataverseService: { terms: { createAcceptance } } }));
vi.mock('../../config/powerPages.config', () => ({ config: { devMode: false } }));

const { acceptTerms } = await import('./acceptTerms');

const term = (id: string): RequiredTerm => ({
  version: {
    actum_termsversionid: id,
    actum_name: `Terms ${id}`,
    actum_scope: TermsScope.General,
    actum_version: 1,
    createdon: '2026-01-01T00:00:00Z',
  },
  accepted: false,
  kind: 'new',
});
const text = (versionId: string, lang: string, body: string): TermsText => ({
  actum_termstextid: `${versionId}-${lang}`,
  _actum_termsversionid_value: versionId,
  _actum_languageid_value: lang,
  actum_body: body,
  createdon: '2026-01-01T00:00:00Z',
});

describe('acceptTerms', () => {
  beforeEach(() => {
    createAcceptance.mockReset();
    createAcceptance.mockResolvedValue(undefined);
  });

  test('skips versions already accepted (no duplicates on retry)', async () => {
    const shown = { v1: text('v1', 'fr', '<p>un</p>'), v2: text('v2', 'nl', '<p>twee</p>') };
    await acceptTerms([term('v1'), term('v2')], 'contact-1', shown, new Set(['v1']));

    expect(createAcceptance).toHaveBeenCalledTimes(1);
    expect(createAcceptance).toHaveBeenCalledWith({
      contactId: 'contact-1',
      versionId: 'v2',
      languageId: 'nl',
      textHash: createHash('sha256').update('<p>twee</p>', 'utf8').digest('hex'),
      name: 'Terms v2',
    });
  });

  test('stops at the first failure', async () => {
    createAcceptance.mockRejectedValueOnce(new Error('boom'));
    const shown = { v1: text('v1', 'fr', 'a'), v2: text('v2', 'fr', 'b') };
    await expect(acceptTerms([term('v1'), term('v2')], 'c', shown, new Set())).rejects.toThrow('boom');
    expect(createAcceptance).toHaveBeenCalledTimes(1);
  });

  test('refuses when the shown text of a version is unknown', async () => {
    await expect(acceptTerms([term('v1')], 'c', {}, new Set())).rejects.toThrow();
    expect(createAcceptance).not.toHaveBeenCalled();
  });
});
