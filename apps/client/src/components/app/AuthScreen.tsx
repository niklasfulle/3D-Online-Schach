import type { Language, Translator } from '../../i18n';
import type { Theme } from '../../theme';

import { AppFooter } from './AppFooter';
import { AuthBoardBackground } from './AuthBoardBackground';
import { LanguageMenu, ThemeMenu } from './Menus';

export function AuthScreen({
  authMode,
  setAuthMode,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  form,
  setForm,
  error,
  onSubmit,
  t,
}: Readonly<{
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  form: { username: string; email: string; password: string };
  setForm: (form: { username: string; email: string; password: string }) => void;
  error: string;
  onSubmit: (event: React.SyntheticEvent<HTMLFormElement>) => void;
  t: Translator;
}>) {
  return (
    <main className="auth-shell" data-theme={theme}>
      <AuthBoardBackground />
      <div className="auth-icon-menus">
        <ThemeMenu theme={theme} onChange={onThemeChange} t={t} />
        <LanguageMenu language={language} onChange={onLanguageChange} t={t} />
      </div>
      <section className="auth-card">
        <p className="eyebrow">3D ONLINE-SCHACH</p>
        <h1>{authMode === 'login' ? t('auth.welcome') : t('auth.createAccount')}</h1>
        <p className="muted">{t('auth.description')}</p>
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>{t('auth.username')}</span>
            <input
              autoComplete="username"
              name="username"
              required
              minLength={3}
              maxLength={24}
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          </label>
          {authMode === 'register' ? (
            <label>
              {t('auth.email')} <span className="muted">({t('auth.optional')})</span>
              <input
                autoComplete="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
          ) : null}
          <label>
            <span>{t('auth.password')}</span>
            <input
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              name="password"
              required
              minLength={8}
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <button className="primary-button" type="submit">
            {authMode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>
        <button
          className="link-button"
          type="button"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? t('auth.noAccount') : t('auth.alreadyRegistered')}
        </button>
      </section>
      <AppFooter t={t} />
    </main>
  );
}
