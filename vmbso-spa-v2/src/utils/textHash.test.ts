import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { sha256Hex } from './textHash';

test('sha256Hex matches the standard SHA-256 test vector', async () => {
  expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('sha256Hex hashes the UTF-8 bytes, like any other SHA-256 tool', async () => {
  const body = '<p>Conditions générales — été</p>';
  expect(await sha256Hex(body)).toBe(createHash('sha256').update(body, 'utf8').digest('hex'));
});
