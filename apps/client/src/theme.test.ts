import { describe, expect, it, vi } from 'vitest';

import { THEME_STORAGE_KEY, readTheme, saveTheme } from './theme';

describe('theme', () => {
  it('uses a persisted theme before the system preference', () => {
    expect(readTheme({ getItem: () => 'light' }, 'dark')).toBe('light');
    expect(readTheme({ getItem: () => 'invalid' }, 'light')).toBe('light');
  });

  it('falls back to the system preference when no selection is stored', () => {
    expect(readTheme({ getItem: () => null }, 'light')).toBe('light');
    expect(readTheme(null, 'dark')).toBe('dark');
  });

  it('persists the selected theme', () => {
    const setItem = vi.fn();

    saveTheme('light', { setItem });

    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
  });
});
