import { describe, expect, it } from 'vitest';

import { resolveApiUrl } from './apiUrl';

describe('resolveApiUrl', () => {
  it('keeps the API on the same host as the browser for local sessions', () => {
    expect(resolveApiUrl(undefined, { protocol: 'http:', hostname: 'localhost' })).toBe(
      'http://localhost:3001',
    );
  });
});
