import { describe, expect, it } from 'vitest';

import { APP_VERSION } from './version.js';

describe('application version', () => {
  it('uses a semantic version from the central source', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
