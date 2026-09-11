import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  createTranslator,
  readLanguage,
  saveLanguage,
} from './i18n';

describe('i18n', () => {
  it('reads supported languages and falls back to German for invalid values', () => {
    expect(readLanguage({ getItem: () => 'en' })).toBe('en');
    expect(readLanguage({ getItem: () => 'fr' })).toBe(DEFAULT_LANGUAGE);
    expect(readLanguage({ getItem: () => null })).toBe(DEFAULT_LANGUAGE);
  });

  it('persists the selected language', () => {
    const setItem = vi.fn();

    saveLanguage('en', { setItem });

    expect(setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'en');
  });

  it('provides typed translations for both supported languages', () => {
    expect(createTranslator('de')('language.label')).toBe('Sprache');
    expect(createTranslator('en')('language.label')).toBe('Language');
    expect(createTranslator('en')('language.de')).toBe('German');
    expect(createTranslator('en')('language.en')).toBe('English');
  });
});
