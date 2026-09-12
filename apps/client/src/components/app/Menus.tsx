import { useState } from 'react';

import type { Language, Translator } from '../../i18n';
import type { Theme } from '../../theme';

export function LanguageMenu({
  language,
  onChange,
  t,
}: Readonly<{
  language: Language;
  onChange: (language: Language) => void;
  t: Translator;
}>) {
  const [open, setOpen] = useState(false);

  function selectLanguage(nextLanguage: Language) {
    onChange(nextLanguage);
    setOpen(false);
  }

  return (
    <div className="icon-menu">
      <button
        className="icon-menu-trigger"
        type="button"
        aria-label={t('language.label')}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('language.label')}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">🌐</span>
      </button>
      {open ? (
        <div className="icon-menu-panel" role="menu" aria-label={t('language.label')}>
          <button
            className={language === 'de' ? 'icon-menu-option active' : 'icon-menu-option'}
            type="button"
            role="menuitem"
            onClick={() => selectLanguage('de')}
          >
            {t('language.de')}
          </button>
          <button
            className={language === 'en' ? 'icon-menu-option active' : 'icon-menu-option'}
            type="button"
            role="menuitem"
            onClick={() => selectLanguage('en')}
          >
            {t('language.en')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ThemeMenu({
  theme,
  onChange,
  t,
}: Readonly<{
  theme: Theme;
  onChange: (theme: Theme) => void;
  t: Translator;
}>) {
  const [open, setOpen] = useState(false);

  function selectTheme(nextTheme: Theme) {
    onChange(nextTheme);
    setOpen(false);
  }

  return (
    <div className="icon-menu">
      <button
        className="icon-menu-trigger"
        type="button"
        aria-label={t('theme.label')}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('theme.label')}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
      </button>
      {open ? (
        <div className="icon-menu-panel" role="menu" aria-label={t('theme.label')}>
          <button
            className={theme === 'dark' ? 'icon-menu-option active' : 'icon-menu-option'}
            type="button"
            role="menuitem"
            onClick={() => selectTheme('dark')}
          >
            {t('theme.dark')}
          </button>
          <button
            className={theme === 'light' ? 'icon-menu-option active' : 'icon-menu-option'}
            type="button"
            role="menuitem"
            onClick={() => selectTheme('light')}
          >
            {t('theme.light')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
