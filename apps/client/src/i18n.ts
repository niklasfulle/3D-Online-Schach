export const DEFAULT_LANGUAGE = 'de' as const;
export const LANGUAGE_STORAGE_KEY = 'chess3d.language';

export const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export type TranslationKey = 'language.label' | 'language.de' | 'language.en';

type LanguageStorage = Pick<Storage, 'getItem' | 'setItem'>;

const translations: Record<Language, Record<TranslationKey, string>> = {
  de: {
    'language.label': 'Sprache',
    'language.de': 'Deutsch',
    'language.en': 'Englisch',
  },
  en: {
    'language.label': 'Language',
    'language.de': 'German',
    'language.en': 'English',
  },
};

function browserStorage(): LanguageStorage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

export function readLanguage(
  storage: Pick<Storage, 'getItem'> | null = browserStorage(),
): Language {
  if (!storage) return DEFAULT_LANGUAGE;
  try {
    const stored = storage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function saveLanguage(
  language: Language,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): void {
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // A blocked or unavailable browser storage must not break the app.
  }
}

export function createTranslator(language: Language) {
  return (key: TranslationKey): string =>
    translations[language][key] ?? translations.de[key] ?? key;
}
