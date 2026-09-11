import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestJson } from './request';

describe('requestJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not send a JSON content type for a bodyless request', async () => {
    let requestInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestInit = init;
      return new Response(JSON.stringify({ ok: true }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await requestJson<{ ok: boolean }>('http://localhost:3001', '/auth/logout', {
      method: 'POST',
    });

    expect(new Headers(requestInit?.headers).has('Content-Type')).toBe(false);
  });
});
