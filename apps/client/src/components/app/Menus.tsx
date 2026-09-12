import type { Language, Translator } from '../../i18n';
import type { Theme } from '../../theme';

const headerIconButtonClass =
  'grid size-10 cursor-pointer place-items-center rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-app-accent shadow-[inset_0_1px_0_rgb(255_255_255_/_4%)] transition-[border-color,background,color,transform] hover:-translate-y-px hover:border-app-accent hover:bg-[var(--chrome-control-hover)] hover:text-[var(--chrome-text)] active:scale-95 focus-visible:outline-3 focus-visible:outline-[rgb(112_168_255_/_42%)] focus-visible:outline-offset-2';

export function LanguageMenu({
  language,
  onChange,
  t,
}: Readonly<{
  language: Language;
  onChange: (language: Language) => void;
  t: Translator;
}>) {
  const languageName = language === 'de' ? t('language.de') : t('language.en');

  return (
    <button
      className={headerIconButtonClass}
      type="button"
      aria-label={`${t('language.label')}: ${languageName}`}
      title={`${t('language.label')}: ${languageName}`}
      onClick={() => onChange(language === 'de' ? 'en' : 'de')}
    >
      {language === 'de' ? (
        <svg className="h-4 w-[1.3rem]" aria-hidden="true" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" fill="#1a2431" />
          <path d="M3 9.67h18v4.66H3z" fill="#d14a57" />
          <path d="M3 14.33h18V19H3z" fill="#e8bc50" />
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.38"
            strokeWidth="1.2"
          />
        </svg>
      ) : (
        <svg className="h-4 w-[1.3rem]" aria-hidden="true" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" fill="#2d5598" />
          <path d="M3 6.2 20.9 17.8M20.9 6.2 3 17.8" fill="none" stroke="#f6f8fc" strokeWidth="3" />
          <path
            d="M3 6.2 20.9 17.8M20.9 6.2 3 17.8"
            fill="none"
            stroke="#d14a57"
            strokeWidth="1.25"
          />
          <path d="M12 5v14M3 12h18" fill="none" stroke="#f6f8fc" strokeWidth="4.2" />
          <path d="M12 5v14M3 12h18" fill="none" stroke="#d14a57" strokeWidth="2" />
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.38"
            strokeWidth="1.2"
          />
        </svg>
      )}
    </button>
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
  const themeName = theme === 'dark' ? t('theme.dark') : t('theme.light');

  return (
    <button
      className={headerIconButtonClass}
      type="button"
      aria-label={`${t('theme.label')}: ${themeName}`}
      title={`${t('theme.label')}: ${themeName}`}
      onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <svg
          className="size-5"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            d="M20 14.2A7.75 7.75 0 0 1 9.8 4 7.75 7.75 0 1 0 20 14.2Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          className="size-5"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="3.5" />
          <path
            d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.72 5.28l-1.42 1.42M6.7 17.3l-1.42 1.42M18.72 18.72l-1.42-1.42M6.7 6.7 5.28 5.28"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
