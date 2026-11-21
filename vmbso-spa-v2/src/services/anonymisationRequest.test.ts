import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../config/powerPages.config', () => ({
  config: { devMode: false, api: { anonymisationRequests: '/_api/actum_anonymisationrequests' } },
}));
vi.mock('./apiClient', () => ({ getCsrfToken: vi.fn().mockResolvedValue('tok') }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { buildAnonymisationRequestBody, submitAnonymisationRequest } = await import('./anonymisationRequest');

describe('buildAnonymisationRequestBody', () => {
  test('body has exactly name, status, requested-on and contact bind', () => {
    const body = buildAnonymisationRequestBody('c-1', new Date('2026-11-04T14:35:09Z'));
    expect(body).toEqual({
      actum_name: 'Anonymisation request - 2026-11-04 14:35',
      actum_requeststatus: 182980000,
      actum_requestedon: '2026-11-04T14:35:09.000Z',
      'actum_Contact@odata.bind': '/contacts(c-1)',
    });
  });

  test('name has no personal data and no account is set', () => {
    const body = buildAnonymisationRequestBody('c-1', new Date());
    expect(body.actum_name).toMatch(/^Anonymisation request - \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(Object.keys(body).some((k) => /account/i.test(k))).toBe(false);
  });
});

describe('submitAnonymisationRequest', () => {
  beforeEach(() => fetchMock.mockReset());

  test('POSTs once with CSRF and no Prefer header', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await submitAnonymisationRequest('c-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/_api/actum_anonymisationrequests');
    expect(init.method).toBe('POST');
    expect(init.headers.__RequestVerificationToken).toBe('tok');
    expect(init.headers).not.toHaveProperty('Prefer');
    expect(JSON.parse(init.body)['actum_Contact@odata.bind']).toBe('/contacts(c-1)');
  });

  test('throws on 403', async () => {
    fetchMock.mockResolvedValue(new Response('denied', { status: 403 }));
    await expect(submitAnonymisationRequest('c-1')).rejects.toThrow(/403/);
  });
});
