import { describe, expect, test } from 'vitest';
import engb from './engb.json';
import frfr from './frfr.json';
import benl from './benl.json';

const KEYS = ['link', 'title', 'confirm', 'no', 'yes', 'submitting', 'success', 'signOut', 'error'];
const files = { engb, frfr, benl } as Record<string, { updateProfilePage: Record<string, unknown> }>;

describe('anonymisation translations', () => {
  test.each(Object.keys(files))('%s has exactly the nine non-empty keys', (lang) => {
    const block = files[lang].updateProfilePage.anonymisation as Record<string, unknown>;
    expect(Object.keys(block ?? {}).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) {
      expect(typeof block[key] === 'string' && (block[key] as string).trim().length > 0).toBe(true);
    }
  });

  test('English popup mentions unused loyalty points and vouchers', () => {
    const block = files.engb.updateProfilePage.anonymisation as Record<string, string>;
    expect(block.confirm).toContain('Loyalty points and vouchers you have not used stay with your company');
  });
});
