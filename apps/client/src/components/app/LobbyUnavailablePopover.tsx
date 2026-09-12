import type { Translator } from '../../i18n';

export function LobbyUnavailablePopover({
  code,
  onClose,
  t,
}: Readonly<{ code: string; onClose: () => void; t: Translator }>) {
  return (
    <dialog
      className="fixed right-6 top-[5.5rem] z-20 flex w-[min(24rem,calc(100vw-2rem))] items-start justify-between gap-4 rounded-2xl border border-[#8e4654] bg-[#3d202b] p-4 text-[#ffdce3] shadow-[0_18px_45px_rgb(0_0_0_/_24%)] max-sm:right-4"
      open
      aria-label={t('lobby.unavailableTitle')}
    >
      <div>
        <strong className="block text-sm tracking-[0.04em] text-[#ffd8dd]">
          {t('lobby.unavailableTitle')}
        </strong>
        <p className="mt-1 text-sm leading-6">
          {t('lobby.unavailableDescription').replace('{code}', code)}
        </p>
      </div>
      <button
        aria-label={t('lobby.closeNotice')}
        className="min-h-11 min-w-11 cursor-pointer rounded-lg bg-transparent px-2 py-1 text-inherit transition hover:bg-white/10"
        type="button"
        onClick={onClose}
      >
        ×
      </button>
    </dialog>
  );
}
