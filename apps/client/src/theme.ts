export const THEME_STORAGE_KEY = 'chess3d.theme';
export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): ThemeStorage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function detectSystemTheme(): Theme {
  return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

export function readTheme(
  storage: Pick<Storage, 'getItem'> | null = browserStorage(),
  systemTheme: Theme = detectSystemTheme(),
): Theme {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : systemTheme;
  } catch {
    return systemTheme;
  }
}

export function saveTheme(
  theme: Theme,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A blocked or unavailable browser storage must not break the app.
  }
}
