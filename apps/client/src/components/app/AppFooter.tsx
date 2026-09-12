import { APP_VERSION } from '@chess3d/shared';

import type { Translator } from '../../i18n';

export function AppFooter({ t }: Readonly<{ t: Translator }>) {
  return (
    <footer
      className="flex w-full items-center justify-between gap-4 border-t border-app-border bg-[color-mix(in_srgb,var(--surface-muted)_42%,transparent)] px-[clamp(1rem,3vw,2rem)] py-[0.85rem] text-xs text-app-text-muted max-[760px]:items-start max-[760px]:flex-col max-[760px]:gap-2 max-[760px]:px-4 max-[760px]:py-3"
      aria-label={t('footer.label')}
    >
      <span className="font-bold text-app-text-strong">♞ Chessboard</span>
      <span>
        {t('footer.version')} {APP_VERSION}
      </span>
      <nav
        className="flex flex-wrap justify-end gap-[0.9rem] max-[760px]:justify-start max-[760px]:gap-[0.7rem]"
        aria-label={t('footer.links')}
      >
        <a
          className="text-app-accent no-underline hover:text-app-text-strong hover:underline"
          href="https://github.com/niklasfulle/3D-Online-Schach"
        >
          {t('footer.repository')}
        </a>
        <a
          className="text-app-accent no-underline hover:text-app-text-strong hover:underline"
          href="/datenschutz"
        >
          {t('footer.privacy')}
        </a>
        <a
          className="text-app-accent no-underline hover:text-app-text-strong hover:underline"
          href="/impressum"
        >
          {t('footer.imprint')}
        </a>
      </nav>
    </footer>
  );
}
