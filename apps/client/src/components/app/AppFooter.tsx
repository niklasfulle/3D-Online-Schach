import { APP_VERSION } from '@chess3d/shared';

import type { Translator } from '../../i18n';

export function AppFooter({ t }: Readonly<{ t: Translator }>) {
  return (
    <footer
      className="app-footer flex w-full items-center justify-between gap-4 border-t border-[rgb(111_151_201_/_13%)] bg-[rgb(9_15_25_/_42%)] px-[clamp(1rem,3vw,2rem)] py-[0.85rem] text-[0.72rem] text-app-text-muted max-[760px]:items-start max-[760px]:flex-col max-[760px]:gap-[0.55rem] max-[760px]:px-4 max-[760px]:py-[0.8rem]"
      aria-label={t('footer.label')}
    >
      <span className="app-footer-brand font-bold text-app-text-strong">♞ Chessboard</span>
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
