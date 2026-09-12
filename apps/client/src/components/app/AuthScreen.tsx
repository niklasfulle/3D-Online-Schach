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
    <main
      className="relative isolate grid min-h-dvh grid-rows-[1fr_auto] place-items-center overflow-hidden bg-[radial-gradient(circle_at_top_right,#1a2940_0,#0b0f16_45%)] p-6 max-sm:p-4"
      data-theme={theme}
    >
      <AuthBoardBackground />
      <div className="absolute right-6 top-6 z-10 flex items-center gap-2 max-sm:right-4 max-sm:top-4">
        <ThemeMenu theme={theme} onChange={onThemeChange} t={t} />
        <LanguageMenu language={language} onChange={onLanguageChange} t={t} />
      </div>
      <section className="relative z-[1] w-full max-w-[29rem] rounded-3xl border border-app-border bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-[clamp(1.25rem,4vw,2.5rem)] text-app-text shadow-[0_24px_80px_rgb(0_0_0_/_25%)] backdrop-blur-[22px]">
        <p className="mb-2 text-xs font-bold tracking-[0.14em] text-app-accent">3D ONLINE-SCHACH</p>
        <h1 className="mb-4 text-[clamp(2rem,5vw,4rem)] leading-none tracking-[-0.04em] text-app-text-strong">
          {authMode === 'login' ? t('auth.welcome') : t('auth.createAccount')}
        </h1>
        <p className="text-app-text-muted">{t('auth.description')}</p>
        {error ? (
          <div
            className="mt-4 flex w-full items-start justify-between gap-4 rounded-xl border border-[#8e4654] bg-[#3d202b] px-4 py-3 text-sm leading-6 text-[#ffdce3]"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <form className="my-6 grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm text-app-text-strong">
            <span>{t('auth.username')}</span>
            <input
              className="w-full rounded-xl border border-app-border-strong bg-[#0c131f] px-4 py-3 text-base text-app-text transition-colors placeholder:text-app-text-muted focus:border-app-accent focus:outline-none focus:ring-4 focus:ring-app-accent/20"
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
            <label className="grid gap-2 text-sm text-app-text-strong">
              <span>
                {t('auth.email')}{' '}
                <span className="text-app-text-muted">({t('auth.optional')})</span>
              </span>
              <input
                className="w-full rounded-xl border border-app-border-strong bg-[#0c131f] px-4 py-3 text-base text-app-text transition-colors placeholder:text-app-text-muted focus:border-app-accent focus:outline-none focus:ring-4 focus:ring-app-accent/20"
                autoComplete="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm text-app-text-strong">
            <span>{t('auth.password')}</span>
            <input
              className="w-full rounded-xl border border-app-border-strong bg-[#0c131f] px-4 py-3 text-base text-app-text transition-colors placeholder:text-app-text-muted focus:border-app-accent focus:outline-none focus:ring-4 focus:ring-app-accent/20"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              name="password"
              required
              minLength={8}
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <button
            className="min-h-12 cursor-pointer rounded-xl bg-[#4777ae] px-4 py-3 font-semibold text-white transition hover:bg-[#568ac7] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
          >
            {authMode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>
        <button
          className="min-h-11 w-full cursor-pointer rounded-xl bg-transparent px-4 py-3 text-app-accent transition hover:bg-app-muted hover:text-app-text-strong"
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
